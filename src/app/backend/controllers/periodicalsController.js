'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  Periodical,
  PeriodicalFaculty,
  Faculty
} = require('../models');
const { resolveContributors } = require('../services/contributorService');

function parseDateToISO(dateStr) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed || trimmed.toLowerCase() === 'nil' || trimmed.toLowerCase() === 'n/a') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`;
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
}

function deriveYearFromDate(dateStr) {
  const iso = parseDateToISO(dateStr);
  return iso ? parseInt(iso.substring(0, 4), 10) : null;
}

// GET /api/periodicals
exports.getPeriodicals = async (req, res) => {
  try {
    const {
      calendarYear,
      department,
      periodicalType,
      publicationType,
      search,
      page = 1,
      limit = 50,
      sortField = 'publicationDate',
      sortOrder = 'DESC'
    } = req.query;

    const whereConditions = [];

    if (calendarYear && calendarYear !== 'all') {
      whereConditions.push({ calendarYear: parseInt(calendarYear, 10) });
    }

    if (department && department !== 'all') {
      whereConditions.push({ department });
    }

    if (periodicalType && periodicalType !== 'all') {
      whereConditions.push({ periodicalType });
    }

    if (publicationType && publicationType !== 'all') {
      whereConditions.push({ publicationType });
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { periodicalName: { [Op.iLike]: q } },
          { publicationType: { [Op.iLike]: q } },
          { periodicalType: { [Op.iLike]: q } }
        ]
      });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await Periodical.findAndCountAll({
      where,
      include: [
        {
          model: PeriodicalFaculty,
          as: 'facultyAssociations',
          include: [
            {
              model: Faculty,
              as: 'faculty',
              attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email']
            }
          ]
        }
      ],
      order: [[sortField, String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
      limit: parsedLimit,
      offset
    });

    res.json({
      success: true,
      total: count,
      count: rows.length,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit),
      rows
    });
  } catch (error) {
    console.error('Get periodicals error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve periodical records.' });
  }
};

// GET /api/periodicals/stats
exports.getPeriodicalStats = async (req, res) => {
  try {
    const { calendarYear, department } = req.query;
    const whereConditions = [];

    if (calendarYear && calendarYear !== 'all') {
      whereConditions.push({ calendarYear: parseInt(calendarYear, 10) });
    }

    if (department && department !== 'all') {
      whereConditions.push({ department });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const records = await Periodical.findAll({
      where,
      include: [{ model: PeriodicalFaculty, as: 'facultyAssociations' }]
    });

    const totalPeriodicals = records.length;
    let totalFacultyContributions = 0;
    const typeMap = {};
    const pubTypeMap = {};
    const yearMap = {};

    records.forEach(r => {
      const assocs = r.facultyAssociations || [];
      totalFacultyContributions += assocs.length;

      const pType = r.periodicalType || 'Other';
      typeMap[pType] = (typeMap[pType] || 0) + 1;

      const pubType = r.publicationType || 'Standard';
      pubTypeMap[pubType] = (pubTypeMap[pubType] || 0) + 1;

      const yr = r.calendarYear;
      if (yr) yearMap[yr] = (yearMap[yr] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalPeriodicals,
        totalFacultyContributions,
        periodicalTypeDistribution: Object.entries(typeMap).map(([name, count]) => ({ name, count })),
        publicationTypeDistribution: Object.entries(pubTypeMap).map(([name, count]) => ({ name, count })),
        yearWiseTrend: Object.entries(yearMap).map(([year, count]) => ({ year: parseInt(year, 10), count })).sort((a, b) => a.year - b.year)
      }
    });
  } catch (error) {
    console.error('Get periodical stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stats.' });
  }
};

// POST /api/periodicals
exports.createPeriodical = async (req, res) => {
  try {
    const {
      periodicalName,
      publicationDate,
      publicationType,
      periodicalType,
      url,
      proofUrl,
      contributors = []
    } = req.body;

    if (!periodicalName || !String(periodicalName).trim()) {
      return res.status(400).json({ success: false, message: 'Periodical Name is required.' });
    }

    const isoDate = parseDateToISO(publicationDate);
    if (!isoDate) {
      return res.status(400).json({ success: false, message: 'Valid Publication Date is required.' });
    }

    const calendarYear = deriveYearFromDate(isoDate);

    // Contributor resolution
    const resolved = await resolveContributors(contributors);
    if (resolved.hasIncompleteContributors && resolved.associations.length === 0) {
      return res.status(400).json({
        success: false,
        message: resolved.errors[0] || 'Invalid contributor provided.'
      });
    }

    // Determine primary department snapshot from first verified contributor
    const firstVerified = resolved.associations.find(a => a.contributorType === 'Verified Faculty' && a.department);
    const department = firstVerified ? firstVerified.department : (resolved.associations[0]?.department || null);
    const school = firstVerified ? firstVerified.school : null;
    const campus = firstVerified ? firstVerified.campus : null;

    const record = await Periodical.create({
      periodicalName: String(periodicalName).trim(),
      publicationDate: isoDate,
      publicationType: publicationType ? String(publicationType).trim() : null,
      periodicalType: periodicalType ? String(periodicalType).trim() : null,
      url: url ? String(url).trim() : null,
      proofUrl: proofUrl ? String(proofUrl).trim() : null,
      calendarYear,
      department,
      school,
      campus,
      createdBy: req.user?.id || null
    });

    if (resolved.associations.length > 0) {
      const assocsToCreate = resolved.associations.map(a => ({
        ...a,
        periodicalId: record.id
      }));
      await PeriodicalFaculty.bulkCreate(assocsToCreate);
    }

    const enriched = await Periodical.findByPk(record.id, {
      include: [
        {
          model: PeriodicalFaculty,
          as: 'facultyAssociations',
          include: [{ model: Faculty, as: 'faculty' }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Periodical record created successfully.',
      data: enriched
    });
  } catch (error) {
    console.error('Create periodical error:', error);
    res.status(500).json({ success: false, message: 'Failed to create record.', error: error.message });
  }
};

// PUT /api/periodicals/:id
exports.updatePeriodical = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Periodical.findByPk(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    const {
      periodicalName,
      publicationDate,
      publicationType,
      periodicalType,
      url,
      proofUrl,
      contributors
    } = req.body;

    if (periodicalName !== undefined) record.periodicalName = String(periodicalName).trim();
    if (publicationDate !== undefined) {
      const iso = parseDateToISO(publicationDate);
      if (!iso) return res.status(400).json({ success: false, message: 'Invalid Publication Date.' });
      record.publicationDate = iso;
      record.calendarYear = deriveYearFromDate(iso);
    }
    if (publicationType !== undefined) record.publicationType = publicationType ? String(publicationType).trim() : null;
    if (periodicalType !== undefined) record.periodicalType = periodicalType ? String(periodicalType).trim() : null;
    if (url !== undefined) record.url = url ? String(url).trim() : null;
    if (proofUrl !== undefined) record.proofUrl = proofUrl ? String(proofUrl).trim() : null;

    if (Array.isArray(contributors)) {
      const resolved = await resolveContributors(contributors);
      await PeriodicalFaculty.destroy({ where: { periodicalId: record.id } });
      if (resolved.associations.length > 0) {
        const assocsToCreate = resolved.associations.map(a => ({
          ...a,
          periodicalId: record.id
        }));
        await PeriodicalFaculty.bulkCreate(assocsToCreate);
      }
    }

    await record.save();

    const enriched = await Periodical.findByPk(record.id, {
      include: [
        {
          model: PeriodicalFaculty,
          as: 'facultyAssociations',
          include: [{ model: Faculty, as: 'faculty' }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Periodical record updated successfully.',
      data: enriched
    });
  } catch (error) {
    console.error('Update periodical error:', error);
    res.status(500).json({ success: false, message: 'Failed to update record.', error: error.message });
  }
};

// DELETE /api/periodicals/:id
exports.deletePeriodical = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await Periodical.findByPk(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    await record.destroy();
    res.json({ success: true, message: 'Record deleted successfully.' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete record.' });
  }
};

// DELETE /api/periodicals/clear-all
// @desc    Clear all periodicals records (Admin only)
exports.clearAllPeriodicals = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only administrators can clear all Periodicals records.' });
    }

    let deletedCount = 0;
    await sequelize.transaction(async (t) => {
      await PeriodicalFaculty.destroy({ where: {}, transaction: t });
      deletedCount = await Periodical.destroy({ where: {}, transaction: t });
    });

    try {
      const { logActionSafe } = require('../middleware/auditLogger');
      await logActionSafe({
        user: req.user,
        action: 'CLEAR_ALL_PERIODICALS',
        title: 'Cleared Periodicals records',
        remarks: `Permanently deleted ${deletedCount} periodicals and related faculty associations.`,
        ipAddress: req.ip
      });
    } catch (e) {
      console.warn('Audit log error on clear periodicals:', e);
    }

    res.json({
      success: true,
      message: `All Periodicals records (${deletedCount}) cleared successfully.`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Clear all periodicals error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear periodicals records.' });
  }
};

// POST /api/periodicals/bulk/validate
exports.validateBulkPeriodicals = async (req, res) => {
  try {
    const { rows = [] } = req.body;
    const validatedRows = [];
    let readyCount = 0;
    let flaggedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      const issues = [];
      let rowStatus = 'ready';

      const periodicalName = String(r.periodicalName || r.name || r['Periodical Name'] || '').trim();
      if (!periodicalName) {
        issues.push('Periodical Name is required.');
        rowStatus = 'needs_review';
      }

      const rawPubDate = r.publicationDate || r.PublicationDate || r['Publication Date'] || r.date || '';
      const isoDate = parseDateToISO(rawPubDate);
      if (!isoDate) {
        issues.push('Valid Publication Date is required.');
        rowStatus = 'needs_review';
      }

      // Contributors
      const rawContributors = Array.isArray(r.contributors)
        ? r.contributors
        : [
            {
              employeeId: r.employeeId || r.empId || r.EmpId || r['EmpID'] || '',
              name: r.name || r.facultyName || r['Faculty Name'] || r['Name'] || '',
              department: r.department || r.Department || ''
            }
          ];

      const resolved = await resolveContributors(rawContributors);
      if (resolved.hasIncompleteContributors && resolved.associations.length === 0) {
        issues.push('Contributor is missing or invalid.');
        rowStatus = 'needs_review';
      }

      if (rowStatus === 'ready') readyCount++;
      else flaggedCount++;

      validatedRows.push({
        _rowNumber: rowNum,
        _rowStatus: rowStatus,
        _issues: issues,
        periodicalName,
        publicationDate: isoDate || rawPubDate,
        publicationType: r.publicationType || r['Publication Type'] || '',
        periodicalType: r.periodicalType || r['Type of Periodical'] || '',
        url: r.url || r['URL'] || '',
        proofUrl: r.proofUrl || r['Proof URL'] || '',
        contributors: resolved.associations
      });
    }

    res.json({
      success: true,
      summary: {
        totalRows: rows.length,
        readyCount,
        flaggedCount
      },
      rows: validatedRows
    });
  } catch (error) {
    console.error('Bulk validate error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate batch.' });
  }
};

// POST /api/periodicals/bulk/import
exports.bulkImportPeriodicals = async (req, res) => {
  try {
    const { rows = [] } = req.body;
    const insertedRecords = [];
    const skippedRecords = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      try {
        const periodicalName = String(r.periodicalName || r.name || r['Periodical Name'] || '').trim();
        const isoDate = parseDateToISO(r.publicationDate || r.PublicationDate || r['Publication Date'] || '');

        if (!periodicalName || !isoDate) {
          skippedRecords.push({ rowNumber: rowNum, periodicalName: periodicalName || 'N/A', reason: 'Missing Name or Publication Date.' });
          continue;
        }

        const rawContributors = Array.isArray(r.contributors) && r.contributors.length > 0
          ? r.contributors
          : [{ employeeId: r.employeeId || r.empId || '', name: r.name || r.facultyName || '', department: r.department || '' }];

        const resolved = await resolveContributors(rawContributors);
        if (resolved.associations.length === 0) {
          skippedRecords.push({ rowNumber: rowNum, periodicalName, reason: 'No valid contributor.' });
          continue;
        }

        const calendarYear = deriveYearFromDate(isoDate);
        const firstVerified = resolved.associations.find(a => a.contributorType === 'Verified Faculty' && a.department);
        const department = firstVerified ? firstVerified.department : (resolved.associations[0]?.department || null);

        const created = await Periodical.create({
          periodicalName,
          publicationDate: isoDate,
          publicationType: r.publicationType ? String(r.publicationType).trim() : null,
          periodicalType: r.periodicalType ? String(r.periodicalType).trim() : null,
          url: r.url ? String(r.url).trim() : null,
          proofUrl: r.proofUrl ? String(r.proofUrl).trim() : null,
          calendarYear,
          department,
          createdBy: req.user?.id || null
        });

        const assocsToCreate = resolved.associations.map(a => ({
          ...a,
          periodicalId: created.id
        }));
        await PeriodicalFaculty.bulkCreate(assocsToCreate);
        insertedRecords.push(created);
      } catch (rowErr) {
        skippedRecords.push({ rowNumber: rowNum, periodicalName: r.periodicalName || 'N/A', reason: rowErr.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk import completed. Successfully imported ${insertedRecords.length} records, skipped ${skippedRecords.length} rows.`,
      summary: {
        totalRows: rows.length,
        importedCount: insertedRecords.length,
        skippedCount: skippedRecords.length
      },
      skippedRecords
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ success: false, message: 'Bulk import failed.', error: error.message });
  }
};
