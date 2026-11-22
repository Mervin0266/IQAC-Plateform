'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  ProfessionalDevelopment,
  ProfessionalDevelopmentFaculty,
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

function resolvePdProgramTypeVariants(rawType) {
  if (!rawType || rawType === 'all') return null;
  const t = String(rawType).trim().toUpperCase();
  if (t === 'FDP' || t.includes('FACULTY DEVELOPMENT')) {
    return ['FDP', 'Faculty Development Programme (FDP)', 'Faculty Development Programme', 'Faculty Development Program'];
  }
  if (t === 'WORKSHOP' || t.includes('WORKSHOP')) {
    return ['WORKSHOP', 'Workshop'];
  }
  if (t === 'MOOC' || t.includes('MOOC')) {
    return ['MOOC', 'Mooc', 'Online Course (MOOC)'];
  }
  if (t === 'TRAINING_PROGRAM' || t === 'TRAINING PROGRAMME' || t.includes('TRAINING')) {
    return ['TRAINING_PROGRAM', 'Training Programme', 'Training Program', 'STAFF_TRAINING', 'Staff Training'];
  }
  if (t === 'QIP' || t.includes('QUALITY IMPROVEMENT')) {
    return ['QIP', 'Quality Improvement Programme (QIP)', 'Quality Improvement Program'];
  }
  if (t === 'STTP' || t === 'STC' || t.includes('SHORT TERM')) {
    return ['STTP', 'Short Term Course (STC)', 'Short Term Training Programme (STTP)', 'STC'];
  }
  if (t === 'STAFF_INDUCTION' || t.includes('INDUCTION')) {
    return ['STAFF_INDUCTION', 'Orientation / Induction Programme', 'Staff Induction', 'Induction Programme'];
  }
  if (t === 'STAFF_ORIENTATION' || t.includes('ORIENTATION')) {
    return ['STAFF_ORIENTATION', 'Orientation / Induction Programme', 'Staff Orientation', 'Orientation Programme'];
  }
  if (t === 'RESEARCH_COLLOQIUM' || t === 'RESEARCH_COLLOQUIUM' || t.includes('COLLOQUIUM') || t.includes('COLLOQIUM')) {
    return ['RESEARCH_COLLOQIUM', 'RESEARCH_COLLOQUIUM', 'Research Colloquium'];
  }
  if (t === 'REFRESHER' || t.includes('REFRESHER')) {
    return ['Refresher Course', 'REFRESHER', 'Refresher'];
  }
  if (t === 'CONFERENCE' || t.includes('CONFERENCE')) {
    return ['Conference', 'CONFERENCE'];
  }
  if (t === 'SEMINAR' || t.includes('SEMINAR')) {
    return ['Seminar', 'SEMINAR'];
  }
  return [rawType, t];
}

// GET /api/professional-developments
exports.getProfessionalDevelopments = async (req, res) => {
  try {
    const {
      calendarYear,
      department,
      programType,
      search,
      page = 1,
      limit = 50,
      sortField = 'startDate',
      sortOrder = 'DESC'
    } = req.query;

    const whereConditions = [];

    if (calendarYear && calendarYear !== 'all') {
      whereConditions.push({ calendarYear: parseInt(calendarYear, 10) });
    }

    if (department && department !== 'all') {
      whereConditions.push({ department });
    }

    if (programType && programType !== 'all') {
      const variants = resolvePdProgramTypeVariants(programType);
      if (variants && variants.length > 0) {
        whereConditions.push({
          [Op.or]: [
            { programType: { [Op.in]: variants } },
            {
              [Op.and]: [
                { programType: null },
                { title: { [Op.in]: variants } }
              ]
            }
          ]
        });
      }
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { title: { [Op.iLike]: q } },
          { programType: { [Op.iLike]: q } },
          { organizedBy: { [Op.iLike]: q } },
          { organizationName: { [Op.iLike]: q } },
          { role: { [Op.iLike]: q } }
        ]
      });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offset = (parsedPage - 1) * parsedLimit;

    const { count, rows } = await ProfessionalDevelopment.findAndCountAll({
      where,
      include: [
        {
          model: ProfessionalDevelopmentFaculty,
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
    console.error('Get professional developments error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve professional development records.' });
  }
};

// GET /api/professional-developments/stats
exports.getProfessionalDevelopmentStats = async (req, res) => {
  try {
    const { calendarYear, department, programType, search } = req.query;
    const whereConditions = [];

    if (calendarYear && calendarYear !== 'all') {
      whereConditions.push({ calendarYear: parseInt(calendarYear, 10) });
    }

    if (department && department !== 'all') {
      whereConditions.push({ department });
    }

    if (programType && programType !== 'all') {
      const variants = resolvePdProgramTypeVariants(programType);
      if (variants && variants.length > 0) {
        whereConditions.push({
          [Op.or]: [
            { programType: { [Op.in]: variants } },
            {
              [Op.and]: [
                { programType: null },
                { title: { [Op.in]: variants } }
              ]
            }
          ]
        });
      }
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { title: { [Op.iLike]: q } },
          { programType: { [Op.iLike]: q } },
          { organizedBy: { [Op.iLike]: q } },
          { organizationName: { [Op.iLike]: q } },
          { role: { [Op.iLike]: q } }
        ]
      });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const records = await ProfessionalDevelopment.findAll({
      where,
      include: [
        {
          model: ProfessionalDevelopmentFaculty,
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

    // 1. Total Programmes (distinct parent records)
    const totalProgrammes = records.length;

    // 2. Total Programme Days (summed once per parent record from durationDays)
    let totalProgrammeDays = 0;
    let missingDurationCount = 0;
    records.forEach(r => {
      const rawDur = r.durationDays;
      if (rawDur !== null && rawDur !== undefined && String(rawDur).trim() !== '') {
        const cleanNum = parseFloat(String(rawDur).replace(/[^0-9.]/g, ''));
        if (!isNaN(cleanNum) && cleanNum > 0) {
          totalProgrammeDays += cleanNum;
        } else {
          missingDurationCount++;
        }
      } else {
        missingDurationCount++;
      }
    });

    // 3. Participating Faculty (distinct verified faculty members)
    const verifiedFacultyIdSet = new Set();
    const guestFacultySet = new Set();
    const unverifiedSet = new Set();
    const deptSet = new Set();
    const departmentWise = {};
    const programTypeMap = {};
    const yearMap = {};
    const durationByProgramType = {};
    const durationByDept = {};
    const facultyByDeptSet = {};
    const facultyByProgramTypeSet = {};

    records.forEach(r => {
      const pType = r.programType || r.title || 'Other';
      const cleanDur = (() => {
        const raw = r.durationDays;
        if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
          const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
          return (!isNaN(num) && num > 0) ? num : 0;
        }
        return 0;
      })();

      if (cleanDur > 0) {
        durationByProgramType[pType] = (durationByProgramType[pType] || 0) + cleanDur;
      }

      if (r.department && String(r.department).trim()) {
        const d = String(r.department).trim();
        deptSet.add(d);
        departmentWise[d] = (departmentWise[d] || 0) + 1;
        if (cleanDur > 0) {
          durationByDept[d] = (durationByDept[d] || 0) + cleanDur;
        }
      }

      programTypeMap[pType] = (programTypeMap[pType] || 0) + 1;

      if (r.calendarYear) {
        yearMap[r.calendarYear] = (yearMap[r.calendarYear] || 0) + 1;
      }

      (r.facultyAssociations || []).forEach(assoc => {
        const assocDept = (assoc.department && String(assoc.department).trim()) || r.department;
        if (assocDept) {
          deptSet.add(String(assocDept).trim());
        }

        const normEmpId = assoc.normalizedEmployeeId || (assoc.employeeId ? String(assoc.employeeId).trim() : null) || assoc.facultyId;
        if (assoc.isGuestFaculty === true) {
          if (normEmpId) guestFacultySet.add(normEmpId);
        } else if (assoc.contributorType === 'Unverified Contributor') {
          if (normEmpId) unverifiedSet.add(normEmpId);
        } else {
          if (normEmpId) {
            verifiedFacultyIdSet.add(normEmpId);
            if (assocDept) {
              if (!facultyByDeptSet[assocDept]) facultyByDeptSet[assocDept] = new Set();
              facultyByDeptSet[assocDept].add(normEmpId);
            }
            if (!facultyByProgramTypeSet[pType]) facultyByProgramTypeSet[pType] = new Set();
            facultyByProgramTypeSet[pType].add(normEmpId);
          }
        }
      });
    });

    const facultyByDept = {};
    Object.entries(facultyByDeptSet).forEach(([d, set]) => {
      facultyByDept[d] = set.size;
    });

    const facultyByProgramType = {};
    Object.entries(facultyByProgramTypeSet).forEach(([p, set]) => {
      facultyByProgramType[p] = set.size;
    });

    res.json({
      success: true,
      data: {
        totalProgrammes,
        totalProgrammeDays: Math.round(totalProgrammeDays * 10) / 10,
        missingDurationCount,
        validDurationCount: totalProgrammes - missingDurationCount,
        participatingFaculty: verifiedFacultyIdSet.size,
        guestFacultyCount: guestFacultySet.size,
        unverifiedFacultyCount: unverifiedSet.size,
        activeDepartments: deptSet.size,
        departmentWise,
        durationByProgramType,
        durationByDept,
        facultyByDept,
        facultyByProgramType,
        programTypeDistribution: Object.entries(programTypeMap).map(([name, count]) => ({ name, count })),
        yearWiseTrend: Object.entries(yearMap).map(([year, count]) => ({ year: parseInt(year, 10), count })).sort((a, b) => a.year - b.year)
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stats.' });
  }
};

// POST /api/professional-developments
exports.createProfessionalDevelopment = async (req, res) => {
  try {
    const {
      title,
      startDate,
      endDate,
      durationDays,
      organizedBy,
      organizationName,
      programType,
      role,
      proofUrl,
      contributors = []
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Name of the Programme is required.' });
    }

    const isoStart = parseDateToISO(startDate);
    if (!isoStart) {
      return res.status(400).json({ success: false, message: 'Valid Start Date is required.' });
    }

    const calendarYear = deriveYearFromDate(isoStart);
    const isoEnd = parseDateToISO(endDate);

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

    const record = await ProfessionalDevelopment.create({
      title: String(title).trim(),
      startDate: isoStart,
      endDate: isoEnd,
      durationDays: durationDays !== undefined && durationDays !== null ? String(durationDays).trim() : null,
      organizedBy: organizedBy ? String(organizedBy).trim() : null,
      organizationName: organizationName ? String(organizationName).trim() : null,
      programType: programType ? String(programType).trim() : null,
      role: role ? String(role).trim() : null,
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
        professionalDevelopmentId: record.id
      }));
      await ProfessionalDevelopmentFaculty.bulkCreate(assocsToCreate);
    }

    const enriched = await ProfessionalDevelopment.findByPk(record.id, {
      include: [
        {
          model: ProfessionalDevelopmentFaculty,
          as: 'facultyAssociations',
          include: [{ model: Faculty, as: 'faculty' }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Professional Development record created successfully.',
      data: enriched
    });
  } catch (error) {
    console.error('Create professional development error:', error);
    res.status(500).json({ success: false, message: 'Failed to create record.', error: error.message });
  }
};

// PUT /api/professional-developments/:id
exports.updateProfessionalDevelopment = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await ProfessionalDevelopment.findByPk(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    const {
      title,
      startDate,
      endDate,
      durationDays,
      organizedBy,
      organizationName,
      programType,
      role,
      proofUrl,
      contributors
    } = req.body;

    if (title !== undefined) record.title = String(title).trim();
    if (startDate !== undefined) {
      const iso = parseDateToISO(startDate);
      if (!iso) return res.status(400).json({ success: false, message: 'Invalid Start Date.' });
      record.startDate = iso;
      record.calendarYear = deriveYearFromDate(iso);
    }
    if (endDate !== undefined) record.endDate = parseDateToISO(endDate);
    if (durationDays !== undefined) record.durationDays = String(durationDays).trim();
    if (organizedBy !== undefined) record.organizedBy = organizedBy ? String(organizedBy).trim() : null;
    if (organizationName !== undefined) record.organizationName = organizationName ? String(organizationName).trim() : null;
    if (programType !== undefined) record.programType = programType ? String(programType).trim() : null;
    if (role !== undefined) record.role = role ? String(role).trim() : null;
    if (proofUrl !== undefined) record.proofUrl = proofUrl ? String(proofUrl).trim() : null;

    if (Array.isArray(contributors)) {
      const resolved = await resolveContributors(contributors);
      await ProfessionalDevelopmentFaculty.destroy({ where: { professionalDevelopmentId: record.id } });
      if (resolved.associations.length > 0) {
        const assocsToCreate = resolved.associations.map(a => ({
          ...a,
          professionalDevelopmentId: record.id
        }));
        await ProfessionalDevelopmentFaculty.bulkCreate(assocsToCreate);
      }
    }

    await record.save();

    const enriched = await ProfessionalDevelopment.findByPk(record.id, {
      include: [
        {
          model: ProfessionalDevelopmentFaculty,
          as: 'facultyAssociations',
          include: [{ model: Faculty, as: 'faculty' }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Professional Development record updated successfully.',
      data: enriched
    });
  } catch (error) {
    console.error('Update professional development error:', error);
    res.status(500).json({ success: false, message: 'Failed to update record.', error: error.message });
  }
};

// DELETE /api/professional-developments/:id
exports.deleteProfessionalDevelopment = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await ProfessionalDevelopment.findByPk(id);
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

// DELETE /api/professional-developments/clear-all
// @desc    Clear all professional developments records (Admin only)
exports.clearAllProfessionalDevelopments = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only administrators can clear all Professional Development records.' });
    }

    let deletedCount = 0;
    await sequelize.transaction(async (t) => {
      await ProfessionalDevelopmentFaculty.destroy({ where: {}, transaction: t });
      deletedCount = await ProfessionalDevelopment.destroy({ where: {}, transaction: t });
    });

    try {
      const { logActionSafe } = require('../middleware/auditLogger');
      await logActionSafe({
        user: req.user,
        action: 'CLEAR_ALL_PROFESSIONAL_DEVELOPMENTS',
        title: 'Cleared Professional Developments records',
        remarks: `Permanently deleted ${deletedCount} professional developments and related faculty associations.`,
        ipAddress: req.ip
      });
    } catch (e) {
      console.warn('Audit log error on clear professional developments:', e);
    }

    res.json({
      success: true,
      message: `All Professional Developments records (${deletedCount}) cleared successfully.`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Clear all professional developments error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear professional developments records.' });
  }
};

// POST /api/professional-developments/bulk/validate
exports.validateBulkProfessionalDevelopments = async (req, res) => {
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

      const title = String(r.title || r.nameOfProgramme || r['Name of Programme'] || r['Name of the Programme'] || r.programmeName || r.programName || '').trim();
      if (!title) {
        issues.push('Name of the Programme is required.');
        rowStatus = 'needs_review';
      }

      const rawStartDate = r.startDate || r.StartDate || r['Start Date'] || '';
      const isoStart = parseDateToISO(rawStartDate);
      if (!isoStart) {
        issues.push('Valid Start Date is required.');
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
        startDate: isoStart || rawStartDate,
        endDate: parseDateToISO(r.endDate || r.EndDate || r['End Date'] || '') || '',
        durationDays: r.durationDays || r.duration || r['Duration (In Days)'] || '',
        organizedBy: r.organizedBy || r['Organized By'] || '',
        organizationName: r.organizationName || r['Organisation Name'] || '',
        programType: r.programType || r['Programme Type'] || '',
        role: r.role || r['Role'] || '',
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

// POST /api/professional-developments/bulk/import
exports.bulkImportProfessionalDevelopments = async (req, res) => {
  try {
    const { rows = [] } = req.body;
    const insertedRecords = [];
    const skippedRecords = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      try {
        const title = String(r.title || r.nameOfProgramme || r['Name of Programme'] || r['Name of the Programme'] || r.programmeName || r.programName || '').trim();
        const isoStart = parseDateToISO(r.startDate || r.StartDate || r['Start Date'] || '');

        if (!title || !isoStart) {
          skippedRecords.push({ rowNumber: rowNum, title: title || 'N/A', reason: 'Missing Title or Start Date.' });
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

        const calendarYear = deriveYearFromDate(isoStart);
        const firstVerified = resolved.associations.find(a => a.contributorType === 'Verified Faculty' && a.department);
        const department = firstVerified ? firstVerified.department : (resolved.associations[0]?.department || null);

        const created = await ProfessionalDevelopment.create({
          title,
          startDate: isoStart,
          endDate: parseDateToISO(r.endDate || r['End Date'] || ''),
          durationDays: r.durationDays ? String(r.durationDays).trim() : null,
          organizedBy: r.organizedBy ? String(r.organizedBy).trim() : null,
          organizationName: r.organizationName ? String(r.organizationName).trim() : null,
          programType: r.programType ? String(r.programType).trim() : null,
          role: r.role ? String(r.role).trim() : null,
          proofUrl: r.proofUrl ? String(r.proofUrl).trim() : null,
          calendarYear,
          department,
          createdBy: req.user?.id || null
        });

        const assocsToCreate = resolved.associations.map(a => ({
          ...a,
          professionalDevelopmentId: created.id
        }));
        await ProfessionalDevelopmentFaculty.bulkCreate(assocsToCreate);
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

exports.resolvePdProgramTypeVariants = resolvePdProgramTypeVariants;
