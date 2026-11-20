'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  InvitedTalk,
  InvitedTalkFaculty,
  Faculty
} = require('../models');
const { resolveContributors } = require('../services/contributorService');

function resolveItProgramTypeVariants(rawType) {
  if (!rawType || rawType === 'all') return null;
  const t = String(rawType).trim().toUpperCase();
  if (t === 'RESEARCH COLLOQUIUM' || t === 'RESEARCH_COLLOQUIUM' || t === 'RESEARCH_COLLOQIUM' || t === 'RESEARCH COLLOQIUM' || t.includes('COLLOQ')) {
    return ['RESEARCH COLLOQUIUM', 'RESEARCH_COLLOQUIUM', 'RESEARCH_COLLOQIUM', 'RESEARCH COLLOQIUM'];
  }
  if (t === 'FDP' || t.includes('FACULTY DEVELOPMENT')) {
    return ['FDP', 'Faculty Development Programme (FDP)', 'Faculty Development Program'];
  }
  if (t === 'QIP' || t.includes('QUALITY IMPROVEMENT')) {
    return ['QIP', 'Quality Improvement Programme (QIP)', 'Quality Improvement Program'];
  }
  if (t === 'WORKSHOP' || t.includes('WORKSHOP')) {
    return ['WORKSHOP', 'Workshop'];
  }
  if (t === 'SEMINAR' || t.includes('SEMINAR')) {
    return ['SEMINAR', 'Seminar'];
  }
  if (t === 'OTHERS' || t === 'OTHER' || t.includes('OTHER')) {
    return ['OTHERS', 'OTHER', 'Other'];
  }
  return [rawType, t];
}

// GET /api/invited-talks
exports.getInvitedTalks = async (req, res) => {
  try {
    const {
      department,
      programType,
      organization,
      media,
      search,
      page = 1,
      limit = 50,
      sortField = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const whereConditions = [];

    if (department && department !== 'all') {
      whereConditions.push({ department });
    }

    if (programType && programType !== 'all') {
      const variants = resolveItProgramTypeVariants(programType);
      if (variants && variants.length > 0) {
        whereConditions.push({
          programType: {
            [Op.in]: variants
          }
        });
      }
    }

    if (organization && organization !== 'all') {
      whereConditions.push({ organization: { [Op.iLike]: `%${String(organization).trim()}%` } });
    }

    if (media && media !== 'all') {
      whereConditions.push({ media: { [Op.iLike]: `%${String(media).trim()}%` } });
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { title: { [Op.iLike]: q } },
          { programType: { [Op.iLike]: q } },
          { organization: { [Op.iLike]: q } },
          { media: { [Op.iLike]: q } }
        ]
      });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await InvitedTalk.findAndCountAll({
      where,
      include: [
        {
          model: InvitedTalkFaculty,
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
    console.error('Get invited talks error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve invited talk records.' });
  }
};

// GET /api/invited-talks/stats (NOTE: Strictly category-based analytics, NO artificial dates/years!)
exports.getInvitedTalkStats = async (req, res) => {
  try {
    const { department, programType, media, search } = req.query;
    const whereConditions = [];

    if (department && department !== 'all') {
      whereConditions.push({ department });
    }

    if (programType && programType !== 'all') {
      const variants = resolveItProgramTypeVariants(programType);
      if (variants && variants.length > 0) {
        whereConditions.push({
          programType: {
            [Op.in]: variants
          }
        });
      }
    }

    if (media && media !== 'all') {
      whereConditions.push({ media: { [Op.iLike]: `%${String(media).trim()}%` } });
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { title: { [Op.iLike]: q } },
          { programType: { [Op.iLike]: q } },
          { organization: { [Op.iLike]: q } },
          { media: { [Op.iLike]: q } }
        ]
      });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const records = await InvitedTalk.findAll({
      where,
      include: [
        {
          model: InvitedTalkFaculty,
          as: 'facultyAssociations',
          include: [
            {
              model: Faculty,
              as: 'faculty',
              attributes: ['id', 'employeeId', 'name', 'designation', 'department']
            }
          ]
        }
      ]
    });

    // 1. Total Invited Talks (distinct parent records)
    const totalTalks = records.length;

    // 2. Host Organizations (distinct non-empty organization names)
    const orgSet = new Set();
    const organizationWise = {};

    // 3. Participating Faculty (distinct verified faculty members)
    const verifiedFacultyIdSet = new Set();
    const guestFacultySet = new Set();
    const unverifiedSet = new Set();

    // 4. Delivery Media Types (distinct non-empty stored Media values)
    const mediaSet = new Set();
    const mediaWise = {};

    const departmentWise = {};
    const programTypeWise = {};

    records.forEach(r => {
      // Organization
      if (r.organization && String(r.organization).trim()) {
        const normOrg = String(r.organization).trim();
        orgSet.add(normOrg.toLowerCase());
        organizationWise[normOrg] = (organizationWise[normOrg] || 0) + 1;
      }

      // Media
      if (r.media && String(r.media).trim()) {
        const normMedia = String(r.media).trim();
        mediaSet.add(normMedia.toLowerCase());
        mediaWise[normMedia] = (mediaWise[normMedia] || 0) + 1;
      }

      // Department
      if (r.department && String(r.department).trim()) {
        const dept = String(r.department).trim();
        departmentWise[dept] = (departmentWise[dept] || 0) + 1;
      }

      // Program Type
      const pType = r.programType || 'Other';
      programTypeWise[pType] = (programTypeWise[pType] || 0) + 1;

      // Faculty contributors
      (r.facultyAssociations || []).forEach(assoc => {
        const normEmpId = assoc.normalizedEmployeeId || (assoc.employeeId ? String(assoc.employeeId).trim() : null) || assoc.facultyId;
        if (assoc.isGuestFaculty === true) {
          if (normEmpId) guestFacultySet.add(normEmpId);
        } else if (assoc.contributorType === 'Unverified Contributor') {
          if (normEmpId) unverifiedSet.add(normEmpId);
        } else {
          if (normEmpId) verifiedFacultyIdSet.add(normEmpId);
        }
      });
    });

    res.json({
      success: true,
      data: {
        totalTalks,
        uniqueOrganizations: orgSet.size,
        participatingFaculty: verifiedFacultyIdSet.size,
        guestFacultyCount: guestFacultySet.size,
        unverifiedFacultyCount: unverifiedSet.size,
        mediaTypesCount: mediaSet.size,
        organizationWise,
        mediaWise,
        departmentWise,
        programTypeWise,
        programTypeDistribution: Object.entries(programTypeWise).map(([name, count]) => ({ name, count }))
      }
    });
  } catch (error) {
    console.error('Get invited talk stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stats.' });
  }
};

// POST /api/invited-talks
exports.createInvitedTalk = async (req, res) => {
  try {
    const {
      title,
      programType,
      organization,
      media,
      proofUrl,
      contributors = []
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Title of the Invited Talk is required.' });
    }

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

    const record = await InvitedTalk.create({
      title: String(title).trim(),
      programType: programType ? String(programType).trim() : null,
      organization: organization ? String(organization).trim() : null,
      media: media ? String(media).trim() : null,
      proofUrl: proofUrl ? String(proofUrl).trim() : null,
      department,
      school,
      campus,
      createdBy: req.user?.id || null
    });

    if (resolved.associations.length > 0) {
      const assocsToCreate = resolved.associations.map(a => ({
        ...a,
        invitedTalkId: record.id
      }));
      await InvitedTalkFaculty.bulkCreate(assocsToCreate);
    }

    const enriched = await InvitedTalk.findByPk(record.id, {
      include: [
        {
          model: InvitedTalkFaculty,
          as: 'facultyAssociations',
          include: [{ model: Faculty, as: 'faculty' }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Invited Talk created successfully.',
      data: enriched
    });
  } catch (error) {
    console.error('Create invited talk error:', error);
    res.status(500).json({ success: false, message: 'Failed to create record.', error: error.message });
  }
};

// PUT /api/invited-talks/:id
exports.updateInvitedTalk = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await InvitedTalk.findByPk(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    const {
      title,
      programType,
      organization,
      media,
      proofUrl,
      contributors
    } = req.body;

    if (title !== undefined) record.title = String(title).trim();
    if (programType !== undefined) record.programType = programType ? String(programType).trim() : null;
    if (organization !== undefined) record.organization = organization ? String(organization).trim() : null;
    if (media !== undefined) record.media = media ? String(media).trim() : null;
    if (proofUrl !== undefined) record.proofUrl = proofUrl ? String(proofUrl).trim() : null;

    if (Array.isArray(contributors)) {
      const resolved = await resolveContributors(contributors);
      await InvitedTalkFaculty.destroy({ where: { invitedTalkId: record.id } });
      if (resolved.associations.length > 0) {
        const assocsToCreate = resolved.associations.map(a => ({
          ...a,
          invitedTalkId: record.id
        }));
        await InvitedTalkFaculty.bulkCreate(assocsToCreate);
      }
    }

    await record.save();

    const enriched = await InvitedTalk.findByPk(record.id, {
      include: [
        {
          model: InvitedTalkFaculty,
          as: 'facultyAssociations',
          include: [{ model: Faculty, as: 'faculty' }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Invited Talk updated successfully.',
      data: enriched
    });
  } catch (error) {
    console.error('Update invited talk error:', error);
    res.status(500).json({ success: false, message: 'Failed to update record.', error: error.message });
  }
};

// DELETE /api/invited-talks/:id
exports.deleteInvitedTalk = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await InvitedTalk.findByPk(id);
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

// DELETE /api/invited-talks/clear-all
// @desc    Clear all invited talks records (Admin only)
exports.clearAllInvitedTalks = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only administrators can clear all Invited Talks records.' });
    }

    let deletedCount = 0;
    await sequelize.transaction(async (t) => {
      await InvitedTalkFaculty.destroy({ where: {}, transaction: t });
      deletedCount = await InvitedTalk.destroy({ where: {}, transaction: t });
    });

    try {
      const { logActionSafe } = require('../middleware/auditLogger');
      await logActionSafe({
        user: req.user,
        action: 'CLEAR_ALL_INVITED_TALKS',
        title: 'Cleared Invited Talks records',
        remarks: `Permanently deleted ${deletedCount} invited talks and related faculty associations.`,
        ipAddress: req.ip
      });
    } catch (e) {
      console.warn('Audit log error on clear invited talks:', e);
    }

    res.json({
      success: true,
      message: `All Invited Talks records (${deletedCount}) cleared successfully.`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Clear all invited talks error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear invited talks records.' });
  }
};

// POST /api/invited-talks/bulk/validate
exports.validateBulkInvitedTalks = async (req, res) => {
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

      const title = String(r.title || r.Title || r['Title'] || '').trim();
      if (!title) {
        issues.push('Title of Invited Talk is required.');
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
        title,
        programType: r.programType || r['Type of Program'] || '',
        organization: r.organization || r['Organization'] || '',
        media: r.media || r['Media'] || '',
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

// POST /api/invited-talks/bulk/import
exports.bulkImportInvitedTalks = async (req, res) => {
  try {
    const { rows = [] } = req.body;
    const insertedRecords = [];
    const skippedRecords = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      try {
        const title = String(r.title || r.Title || r['Title'] || '').trim();
        if (!title) {
          skippedRecords.push({ rowNumber: rowNum, title: 'N/A', reason: 'Missing Title.' });
          continue;
        }

        const rawContributors = Array.isArray(r.contributors) && r.contributors.length > 0
          ? r.contributors
          : [{ employeeId: r.employeeId || r.empId || '', name: r.name || r.facultyName || '', department: r.department || '' }];

        const resolved = await resolveContributors(rawContributors);
        if (resolved.associations.length === 0) {
          skippedRecords.push({ rowNumber: rowNum, title, reason: 'No valid contributor.' });
          continue;
        }

        const firstVerified = resolved.associations.find(a => a.contributorType === 'Verified Faculty' && a.department);
        const department = firstVerified ? firstVerified.department : (resolved.associations[0]?.department || null);

        const created = await InvitedTalk.create({
          title,
          programType: r.programType ? String(r.programType).trim() : null,
          organization: r.organization ? String(r.organization).trim() : null,
          media: r.media ? String(r.media).trim() : null,
          proofUrl: r.proofUrl ? String(r.proofUrl).trim() : null,
          department,
          createdBy: req.user?.id || null
        });

        const assocsToCreate = resolved.associations.map(a => ({
          ...a,
          invitedTalkId: created.id
        }));
        await InvitedTalkFaculty.bulkCreate(assocsToCreate);
        insertedRecords.push(created);
      } catch (rowErr) {
        skippedRecords.push({ rowNumber: rowNum, title: r.title || 'N/A', reason: rowErr.message });
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

exports.resolveItProgramTypeVariants = resolveItProgramTypeVariants;
