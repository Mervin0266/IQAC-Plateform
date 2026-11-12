'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const {
  Copyright,
  CopyrightFaculty,
  Faculty,
  User,
  UserDepartmentHistory,
  Department,
  School
} = require('../models');
const { sequelize } = require('../config/database');
const { logActionSafe } = require('../middleware/auditLogger');
const { parsePagination, formatPaginationResponse } = require('../utils/paginationHelper');
const googleDriveService = require('../services/googleDriveService');
const {
  normalizeDeptKey,
  normalizeEmpIdKey,
  parseAndNormalizeEmpIds,
  sanitizeDateNoShift,
  isBlankDateValue,
  deriveCalendarYear,
  normalizeDuplicateSignature,
  resolveFacultyAssociationsForEmpIds,
  enrichCopyrightRecord,
  matchesDepartmentFilter,
  computeCopyrightMetrics,
  validateProofUrlInput
} = require('../services/copyrightService');

const ALLOWED_TEMPLATE_COLUMNS = [
  'EmpId',
  'Title',
  'Date of Application',
  'Registration No',
  'Diary Number',
  'Date of Receipt',
  'Proof'
];

/**
 * Resolves whether a user has university-wide view access (and for writes, admin/iqac_admin).
 */
async function resolveUserDeptScope(user) {
  if (!user) return { isUniversityWide: false, departments: [] };

  const scopes = Array.isArray(user.assignedScopes) ? user.assignedScopes : [];
  const hasUnivScope =
    user.isSystemAdmin ||
    user.role === 'admin' ||
    user.role === 'iqac_admin' ||
    user.role === 'authority' ||
    scopes.some(s => s.scopeType === 'university');

  if (hasUnivScope) {
    return { isUniversityWide: true, departments: [] };
  }

  const deptNames = new Set();
  if (user.department && String(user.department).trim() && user.department !== 'All') {
    deptNames.add(String(user.department).trim());
  }

  const campusIds = scopes.filter(s => s.scopeType === 'campus' && s.campusId).map(s => s.campusId);
  const schoolIds = scopes.filter(s => s.scopeType === 'school' && s.schoolId).map(s => s.schoolId);

  if (campusIds.length > 0 && School) {
    try {
      const sRows = await School.findAll({ where: { campusId: { [Op.in]: campusIds } }, attributes: ['id'], raw: true });
      sRows.forEach(s => schoolIds.push(s.id));
    } catch (_) {}
  }

  if (schoolIds.length > 0 && Department) {
    try {
      const dRows = await Department.findAll({ where: { schoolId: { [Op.in]: schoolIds } }, attributes: ['name'], raw: true });
      dRows.forEach(d => deptNames.add(d.name));
    } catch (_) {}
  }

  scopes.forEach(s => {
    if (s.departmentName && String(s.departmentName).trim()) {
      deptNames.add(String(s.departmentName).trim());
    }
  });

  return {
    isUniversityWide: false,
    departments: Array.from(deptNames)
  };
}

/**
 * Checks whether user can view or manage a specific enriched copyright record.
 */
async function checkCopyrightAccess(enrichedRecord, user, action = 'view') {
  if (!user) return { allowed: false, message: 'Authentication required' };

  if (user.isSystemAdmin || user.role === 'admin' || user.role === 'iqac_admin') {
    return { allowed: true };
  }

  if (user.role === 'authority') {
    if (action === 'view') {
      if (enrichedRecord.status === 'draft') {
        return { allowed: false, message: 'Draft copyrights are restricted to submitters and department administrators.' };
      }
      return { allowed: true };
    }
    return { allowed: false, message: 'Authority role has read-only inspection access.' };
  }

  const scope = await resolveUserDeptScope(user);
  if (scope.isUniversityWide) {
    if (action === 'manage' && user.role === 'faculty' && enrichedRecord.createdBy !== user.id) {
      return { allowed: false, message: 'Access denied: Faculty can only modify their own copyright records.' };
    }
    return { allowed: true };
  }

  const validDepts = new Set(scope.departments.map(normalizeDeptKey).filter(Boolean));
  const recordMatchesUserDept = (enrichedRecord.facultyAssociations || [])
    .filter(f => f.isValid)
    .some(f => validDepts.has(normalizeDeptKey(f.currentDepartment)) || validDepts.has(normalizeDeptKey(f.originalDepartment)));

  if (action === 'view') {
    if (recordMatchesUserDept || enrichedRecord.createdBy === user.id) {
      return { allowed: true };
    }
    return { allowed: false, message: 'Access denied: Copyright belongs to another department.' };
  }

  // manage (edit/delete/proof upload)
  if (['coordinator', 'hod'].includes(user.role)) {
    if (recordMatchesUserDept || enrichedRecord.createdBy === user.id) {
      return { allowed: true };
    }
    return { allowed: false, message: 'Access denied: Cannot modify copyrights outside your authorized department.' };
  }

  if (user.role === 'faculty') {
    if (enrichedRecord.createdBy === user.id) {
      return { allowed: true };
    }
    return { allowed: false, message: 'Access denied: Faculty can only modify their own copyright records.' };
  }

  return { allowed: false, message: 'Unauthorized action.' };
}

/**
 * Loads live canonical faculty maps for fast enrichment without N+1 queries.
 */
async function loadLiveFacultyMaps() {
  const rows = await Faculty.findAll({
    attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email', 'academicYear', 'createdAt'],
    order: [['academicYear', 'DESC'], ['createdAt', 'DESC']],
    raw: true
  }).catch(() => []);

  const byId = new Map();
  const byNormEmpKey = new Map();

  for (const row of rows) {
    byId.set(row.id, row);
    const key = normalizeEmpIdKey(row.employeeId);
    // Ordered DESC by academicYear/createdAt, so first encountered row per empId is canonical latest
    if (key && !byNormEmpKey.has(key)) {
      byNormEmpKey.set(key, row);
    }
  }

  return { byId, byNormEmpKey, allRows: rows };
}

/**
 * Normalizes query department filter parameter (supports single string or comma-separated multi-select).
 */
function parseDepartmentFilterParam(deptParam) {
  if (!deptParam) return [];
  const raw = Array.isArray(deptParam) ? deptParam.join(',') : String(deptParam);
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s && s.toLowerCase() !== 'all');
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. SEARCH FACULTY DIRECTORY (Method A Multi-Select Selector)
// ──────────────────────────────────────────────────────────────────────────────
exports.searchFacultyDirectory = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 200);
    const scope = await resolveUserDeptScope(req.user);

    const { byNormEmpKey } = await loadLiveFacultyMaps();
    let list = Array.from(byNormEmpKey.values());

    if (!scope.isUniversityWide && scope.departments.length > 0) {
      // Allow searching across University faculty for co-inventors/co-authors, prioritizing user's department first
      const userDeptKeys = new Set(scope.departments.map(normalizeDeptKey));
      list.sort((a, b) => {
        const aIn = userDeptKeys.has(normalizeDeptKey(a.department)) ? 0 : 1;
        const bIn = userDeptKeys.has(normalizeDeptKey(b.department)) ? 0 : 1;
        if (aIn !== bIn) return aIn - bIn;
        return String(a.employeeId || '').localeCompare(String(b.employeeId || ''), undefined, { numeric: true });
      });
    } else {
      list.sort((a, b) => String(a.employeeId || '').localeCompare(String(b.employeeId || ''), undefined, { numeric: true }));
    }

    if (q) {
      list = list.filter(f =>
        String(f.employeeId || '').toLowerCase().includes(q) ||
        String(f.name || '').toLowerCase().includes(q) ||
        String(f.department || '').toLowerCase().includes(q) ||
        String(f.designation || '').toLowerCase().includes(q)
      );
    }

    const trimmed = list.slice(0, limit).map(f => ({
      id: f.id,
      employeeId: String(f.employeeId).trim(),
      name: f.name,
      designation: f.designation,
      department: f.department,
      email: f.email || null
    }));

    res.json({ success: true, data: trimmed, total: list.length });
  } catch (error) {
    console.error('Search faculty directory error:', error);
    res.status(500).json({ success: false, message: 'Failed to search Faculty Management directory.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 2. LIST COPYRIGHTS & AGGREGATED STATS (Distinct Record Filtering)
// ──────────────────────────────────────────────────────────────────────────────
async function fetchFilteredCopyrightsForRequest(req) {
  const {
    year,
    department,
    registrationStatus,
    proofStatus,
    validationStatus,
    search
  } = req.query;

  const where = {};
  if (year && year !== 'all') {
    const yrInt = parseInt(String(year).trim(), 10);
    if (!Number.isNaN(yrInt)) {
      where.calendarYear = yrInt;
    }
  }

  // Authority cannot view drafts
  if (req.user && req.user.role === 'authority') {
    where.status = { [Op.ne]: 'draft' };
  }

  const allRecords = await Copyright.findAll({
    where,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      },
      {
        model: CopyrightFaculty,
        as: 'facultyAssociations'
      }
    ],
    order: [
      ['dateOfApplication', 'DESC'],
      ['createdAt', 'DESC'],
      ['id', 'ASC']
    ]
  });

  const { byId, byNormEmpKey } = await loadLiveFacultyMaps();
  const userScope = await resolveUserDeptScope(req.user);

  // Deduplicate by unique copyright ID (guarantees multi-faculty joins never produce duplicate rows)
  const uniqueMap = new Map();
  for (const row of allRecords) {
    if (!uniqueMap.has(row.id)) {
      uniqueMap.set(row.id, enrichCopyrightRecord(row, byId, byNormEmpKey));
    }
  }
  let enrichedList = Array.from(uniqueMap.values());

  // Enforce authorized organizational scope strictly on backend
  if (!userScope.isUniversityWide && req.user) {
    const allowedKeys = new Set(userScope.departments.map(normalizeDeptKey).filter(Boolean));
    enrichedList = enrichedList.filter(c => {
      if (c.createdBy === req.user.id) return true;
      return (c.facultyAssociations || [])
        .filter(f => f.isValid)
        .some(f => allowedKeys.has(normalizeDeptKey(f.currentDepartment)) || allowedKeys.has(normalizeDeptKey(f.originalDepartment)));
    });
  }

  // Enforce explicit department filter safely inside user's permitted scope
  const requestedDepts = parseDepartmentFilterParam(department);
  if (requestedDepts.length > 0) {
    if (!userScope.isUniversityWide) {
      const allowedKeys = new Set(userScope.departments.map(normalizeDeptKey).filter(Boolean));
      const unauthorizedDept = requestedDepts.find(d => !allowedKeys.has(normalizeDeptKey(d)));
      if (unauthorizedDept) {
        const err = new Error(`Access denied. Department '${unauthorizedDept}' is outside your authorized scope.`);
        err.status = 403;
        throw err;
      }
    }
    enrichedList = enrichedList.filter(c => matchesDepartmentFilter(c, requestedDepts));
  }

  // Filter by derived registration status ('registered' | 'pending' | 'draft')
  if (registrationStatus && registrationStatus !== 'all') {
    enrichedList = enrichedList.filter(c => c.registrationStatus === registrationStatus);
  }

  // Filter by proof status
  if (proofStatus && proofStatus !== 'all') {
    enrichedList = enrichedList.filter(c => {
      const hasProof = Boolean(c.proofUrl && String(c.proofUrl).trim() !== '');
      if (proofStatus === 'has_proof') return hasProof;
      if (proofStatus === 'missing') return !hasProof;
      if (proofStatus === 'issue') return hasProof && c.proofAccessStatus === 'access_issue';
      return true;
    });
  }

  // Filter by EmpId validation status
  if (validationStatus && validationStatus !== 'all') {
    if (validationStatus === 'invalid_empids') {
      enrichedList = enrichedList.filter(c => c.hasInvalidEmpIds);
    } else if (validationStatus === 'valid') {
      enrichedList = enrichedList.filter(c => !c.hasInvalidEmpIds);
    }
  }

  // Search across Title, EmpId, Faculty Name, Registration No, Diary Number
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    enrichedList = enrichedList.filter(c => {
      if ((c.title || '').toLowerCase().includes(q)) return true;
      if ((c.registrationNo || '').toLowerCase().includes(q)) return true;
      if ((c.diaryNumber || '').toLowerCase().includes(q)) return true;
      if ((c.empIdsRaw || '').toLowerCase().includes(q)) return true;
      return (c.facultyAssociations || []).some(f =>
        (f.employeeId || '').toLowerCase().includes(q) ||
        (f.facultyName || '').toLowerCase().includes(q) ||
        (f.currentDepartment || '').toLowerCase().includes(q) ||
        (f.originalDepartment || '').toLowerCase().includes(q)
      );
    });
  }

  return enrichedList;
}

exports.getCopyrights = async (req, res) => {
  try {
    const filteredList = await fetchFilteredCopyrightsForRequest(req);
    const metrics = computeCopyrightMetrics(filteredList);

    const { page, limit, offset, isExport } = parsePagination(req.query);
    const paginatedRows = isExport ? filteredList : filteredList.slice(offset, offset + limit);

    const response = formatPaginationResponse({
      count: filteredList.length,
      rows: paginatedRows,
      page,
      limit
    });

    res.json({
      ...response,
      metrics
    });
  } catch (error) {
    console.error('Get copyrights error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve copyright records'
    });
  }
};

exports.getCopyrightStats = async (req, res) => {
  try {
    const filteredList = await fetchFilteredCopyrightsForRequest(req);
    const metrics = computeCopyrightMetrics(filteredList);
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Get copyright stats error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve copyright statistics'
    });
  }
};

exports.getCopyright = async (req, res) => {
  try {
    const row = await Copyright.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'department'] },
        { model: CopyrightFaculty, as: 'facultyAssociations' }
      ]
    });

    if (!row) {
      return res.status(404).json({ success: false, message: 'Copyright record not found.' });
    }

    const { byId, byNormEmpKey } = await loadLiveFacultyMaps();
    const enriched = enrichCopyrightRecord(row, byId, byNormEmpKey);

    const access = await checkCopyrightAccess(enriched, req.user, 'view');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Get copyright error:', error);
    res.status(500).json({ success: false, message: 'Failed to load copyright details.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 3. CREATE / UPDATE / DELETE COPYRIGHT
// ──────────────────────────────────────────────────────────────────────────────
exports.createCopyright = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      empIds: bodyEmpIds,
      empIdsRaw,
      title,
      dateOfApplication,
      registrationNo,
      diaryNumber,
      dateOfReceipt,
      proofUrl,
      status,
      customFields
    } = req.body;

    // 1. Validate mandatory fields: EmpId, Title, Date of Application
    const cleanTitle = title ? String(title).trim() : '';
    if (!cleanTitle) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    const parsedEmp = parseAndNormalizeEmpIds(bodyEmpIds !== undefined ? bodyEmpIds : empIdsRaw);
    if (parsedEmp.empIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'At least one Employee ID (EmpId) is required.' });
    }

    const isoAppDate = sanitizeDateNoShift(dateOfApplication);
    if (!isoAppDate) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Valid Date of Application is required.' });
    }
    const calendarYear = deriveCalendarYear(isoAppDate);

    let isoReceiptDate = null;
    if (!isBlankDateValue(dateOfReceipt)) {
      isoReceiptDate = sanitizeDateNoShift(dateOfReceipt);
      if (!isoReceiptDate) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Invalid Date of Receipt format.' });
      }
    }

    const proofCheck = validateProofUrlInput(proofUrl);
    if (!proofCheck.valid) {
      await t.rollback();
      return res.status(400).json({ success: false, message: `Invalid Proof URL: ${proofCheck.error}` });
    }

    // 2. Duplicate check against existing copyrights using normalized Title + Date + sorted EmpIds
    const incomingSig = normalizeDuplicateSignature({
      title: cleanTitle,
      dateOfApplication: isoAppDate,
      empIds: parsedEmp.empIds
    });

    const existingCandidates = await Copyright.findAll({
      where: { dateOfApplication: isoAppDate },
      include: [{ model: CopyrightFaculty, as: 'facultyAssociations', attributes: ['employeeId'] }]
    });

    const isDup = existingCandidates.some(ex => {
      const exEmpIds = (ex.facultyAssociations && ex.facultyAssociations.length > 0)
        ? ex.facultyAssociations.map(a => a.employeeId)
        : parseAndNormalizeEmpIds(ex.empIdsRaw).empIds;
      const exSig = normalizeDuplicateSignature({
        title: ex.title,
        dateOfApplication: ex.dateOfApplication,
        empIds: exEmpIds
      });
      return exSig === incomingSig;
    });

    if (isDup) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_COPYRIGHT',
        message: 'A copyright record with matching Title, Date of Application, and associated Employee IDs already exists.'
      });
    }

    // 3. Resolve Faculty associations & immutable historical/creation department snapshots
    const resolved = await resolveFacultyAssociationsForEmpIds(
      parsedEmp.empIds,
      isoAppDate,
      { Faculty, User, UserDepartmentHistory }
    );

    // Scope enforcement for non-university-wide users (must include at least one valid faculty from their dept unless admin)
    const userScope = await resolveUserDeptScope(req.user);
    if (!userScope.isUniversityWide && req.user && ['coordinator', 'hod'].includes(req.user.role)) {
      const allowedKeys = new Set(userScope.departments.map(normalizeDeptKey).filter(Boolean));
      const hasOwnDeptValidFaculty = resolved.associations.some(
        a => a.isValid && allowedKeys.has(normalizeDeptKey(a.originalDepartment))
      );
      if (resolved.associations.some(a => a.isValid) && !hasOwnDeptValidFaculty) {
        await t.rollback();
        return res.status(403).json({
          success: false,
          message: 'Access denied: At least one associated faculty member must belong to your authorized department.'
        });
      }
    }

    let proofAccessStatus = null;
    let proofAccessRemarks = null;
    if (proofCheck.provided) {
      const ver = await googleDriveService.verifyDriveLinkAccess(proofCheck.url);
      proofAccessStatus = ver.status;
      proofAccessRemarks = ver.remarks;
    }

    const cleanRegNo = registrationNo && String(registrationNo).trim() ? String(registrationNo).trim() : null;
    const cleanDiaryNo = diaryNumber && String(diaryNumber).trim() ? String(diaryNumber).trim() : null;
    const effectiveStatus = status === 'draft' ? 'draft' : (cleanRegNo ? 'registered' : 'submitted');

    const created = await Copyright.create({
      title: cleanTitle,
      empIdsRaw: parsedEmp.empIdsRaw,
      dateOfApplication: isoAppDate,
      calendarYear,
      registrationNo: cleanRegNo,
      diaryNumber: cleanDiaryNo,
      dateOfReceipt: isoReceiptDate,
      status: effectiveStatus,
      proofUrl: proofCheck.provided ? proofCheck.url : null,
      proofSourceType: proofCheck.provided ? 'drive_link' : null,
      proofFileId: proofCheck.provided ? proofCheck.fileId : null,
      proofFileName: proofCheck.provided ? `Google Drive Document (${(proofCheck.fileId || 'link').slice(0, 8)})` : null,
      proofAccessStatus,
      proofAccessRemarks,
      hasInvalidEmpIds: resolved.hasInvalidEmpIds,
      invalidEmpIds: resolved.invalidEmpIds,
      duplicateEmpIds: parsedEmp.duplicateEmpIds,
      customFields: customFields && typeof customFields === 'object' ? customFields : {},
      createdBy: req.user?.id || null
    }, { transaction: t });

    await CopyrightFaculty.bulkCreate(
      resolved.associations.map(a => ({ ...a, copyrightId: created.id })),
      { transaction: t }
    );

    await t.commit();

    const fullRecord = await Copyright.findByPk(created.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'department'] },
        { model: CopyrightFaculty, as: 'facultyAssociations' }
      ]
    });
    const { byId, byNormEmpKey } = await loadLiveFacultyMaps();
    const enriched = enrichCopyrightRecord(fullRecord, byId, byNormEmpKey);

    await logActionSafe({
      recordId: created.id,
      title: created.title,
      user: req.user,
      action: 'CREATE_COPYRIGHT',
      updatedValue: enriched,
      ipAddress: req.ip,
      remarks: resolved.hasInvalidEmpIds
        ? `Created copyright with unrecognized EmpIds flagged: ${resolved.invalidEmpIds.join(', ')}`
        : `Created copyright (${parsedEmp.empIds.length} faculty associations)`
    });

    res.status(201).json({
      success: true,
      data: enriched,
      warnings: {
        invalidEmpIds: resolved.invalidEmpIds,
        duplicateEmpIds: parsedEmp.duplicateEmpIds
      }
    });
  } catch (error) {
    try { await t.rollback(); } catch (_) {}
    console.error('Create copyright error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create copyright record.'
    });
  }
};

exports.updateCopyright = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const existing = await Copyright.findByPk(req.params.id, {
      include: [{ model: CopyrightFaculty, as: 'facultyAssociations' }],
      transaction: t
    });

    if (!existing) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Copyright record not found.' });
    }

    const { byId, byNormEmpKey } = await loadLiveFacultyMaps();
    const currentEnriched = enrichCopyrightRecord(existing, byId, byNormEmpKey);

    const access = await checkCopyrightAccess(currentEnriched, req.user, 'manage');
    if (!access.allowed) {
      await t.rollback();
      return res.status(403).json({ success: false, message: access.message });
    }

    const {
      empIds: bodyEmpIds,
      empIdsRaw,
      title,
      dateOfApplication,
      registrationNo,
      diaryNumber,
      dateOfReceipt,
      proofUrl,
      status,
      customFields
    } = req.body;

    const cleanTitle = title !== undefined ? String(title).trim() : existing.title;
    if (!cleanTitle) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Title cannot be empty.' });
    }

    const isoAppDate = dateOfApplication !== undefined ? sanitizeDateNoShift(dateOfApplication) : existing.dateOfApplication;
    if (!isoAppDate) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Valid Date of Application is required.' });
    }
    const calendarYear = deriveCalendarYear(isoAppDate);

    let isoReceiptDate = existing.dateOfReceipt;
    if (dateOfReceipt !== undefined) {
      if (isBlankDateValue(dateOfReceipt)) {
        isoReceiptDate = null;
      } else {
        isoReceiptDate = sanitizeDateNoShift(dateOfReceipt);
        if (!isoReceiptDate) {
          await t.rollback();
          return res.status(400).json({ success: false, message: 'Invalid Date of Receipt format.' });
        }
      }
    }

    const parsedEmp = (bodyEmpIds !== undefined || empIdsRaw !== undefined)
      ? parseAndNormalizeEmpIds(bodyEmpIds !== undefined ? bodyEmpIds : empIdsRaw)
      : parseAndNormalizeEmpIds(existing.empIdsRaw);

    if (parsedEmp.empIds.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'At least one Employee ID (EmpId) is required.' });
    }

    // Preserve immutable originalDepartment snapshots for continuing valid associations!
    const prevAssocByNormKey = new Map();
    (existing.facultyAssociations || []).forEach(a => {
      prevAssocByNormKey.set(a.normalizedEmployeeId || normalizeEmpIdKey(a.employeeId), a);
    });

    const freshResolved = await resolveFacultyAssociationsForEmpIds(
      parsedEmp.empIds,
      isoAppDate,
      { Faculty, User, UserDepartmentHistory }
    );

    const mergedAssociations = freshResolved.associations.map(assoc => {
      const prior = prevAssocByNormKey.get(assoc.normalizedEmployeeId);
      if (prior && prior.isValid && prior.originalDepartment && assoc.isValid) {
        return {
          ...assoc,
          originalDepartment: prior.originalDepartment,
          originalDepartmentSource: prior.originalDepartmentSource || 'creation_snapshot'
        };
      }
      return assoc;
    });

    const proofUpdates = {};
    if (proofUrl !== undefined) {
      const proofCheck = validateProofUrlInput(proofUrl);
      if (!proofCheck.valid) {
        await t.rollback();
        return res.status(400).json({ success: false, message: `Invalid Proof URL: ${proofCheck.error}` });
      }
      if (!proofCheck.provided) {
        proofUpdates.proofUrl = null;
        proofUpdates.proofSourceType = null;
        proofUpdates.proofFileId = null;
        proofUpdates.proofFileName = null;
        proofUpdates.proofAccessStatus = null;
        proofUpdates.proofAccessRemarks = null;
      } else if (!proofCheck.isInternal) {
        const ver = await googleDriveService.verifyDriveLinkAccess(proofCheck.url);
        proofUpdates.proofUrl = proofCheck.url;
        proofUpdates.proofSourceType = 'drive_link';
        proofUpdates.proofFileId = proofCheck.fileId;
        proofUpdates.proofFileName = `Google Drive Document (${(proofCheck.fileId || 'link').slice(0, 8)})`;
        proofUpdates.proofAccessStatus = ver.status;
        proofUpdates.proofAccessRemarks = ver.remarks;
      }
    }

    const cleanRegNo = registrationNo !== undefined
      ? (registrationNo && String(registrationNo).trim() ? String(registrationNo).trim() : null)
      : existing.registrationNo;
    const cleanDiaryNo = diaryNumber !== undefined
      ? (diaryNumber && String(diaryNumber).trim() ? String(diaryNumber).trim() : null)
      : existing.diaryNumber;

    const nextStatus = status === 'draft'
      ? 'draft'
      : (cleanRegNo ? 'registered' : 'submitted');

    await existing.update({
      title: cleanTitle,
      empIdsRaw: parsedEmp.empIdsRaw,
      dateOfApplication: isoAppDate,
      calendarYear,
      registrationNo: cleanRegNo,
      diaryNumber: cleanDiaryNo,
      dateOfReceipt: isoReceiptDate,
      status: nextStatus,
      hasInvalidEmpIds: freshResolved.hasInvalidEmpIds,
      invalidEmpIds: freshResolved.invalidEmpIds,
      duplicateEmpIds: parsedEmp.duplicateEmpIds,
      ...(customFields && typeof customFields === 'object' ? { customFields: { ...(existing.customFields || {}), ...customFields } } : {}),
      ...proofUpdates
    }, { transaction: t });

    await CopyrightFaculty.destroy({ where: { copyrightId: existing.id }, transaction: t });
    await CopyrightFaculty.bulkCreate(
      mergedAssociations.map(a => ({ ...a, copyrightId: existing.id })),
      { transaction: t }
    );

    await t.commit();

    const updatedFull = await Copyright.findByPk(existing.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'department'] },
        { model: CopyrightFaculty, as: 'facultyAssociations' }
      ]
    });
    const enriched = enrichCopyrightRecord(updatedFull, byId, byNormEmpKey);

    await logActionSafe({
      recordId: existing.id,
      title: enriched.title,
      user: req.user,
      action: 'UPDATE_COPYRIGHT',
      previousValue: currentEnriched,
      updatedValue: enriched,
      ipAddress: req.ip,
      remarks: `Updated copyright: ${enriched.title}`
    });

    res.json({
      success: true,
      data: enriched,
      warnings: {
        invalidEmpIds: freshResolved.invalidEmpIds,
        duplicateEmpIds: parsedEmp.duplicateEmpIds
      }
    });
  } catch (error) {
    try { await t.rollback(); } catch (_) {}
    console.error('Update copyright error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update copyright record.' });
  }
};

exports.deleteCopyright = async (req, res) => {
  try {
    const existing = await Copyright.findByPk(req.params.id, {
      include: [{ model: CopyrightFaculty, as: 'facultyAssociations' }]
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Copyright record not found.' });
    }

    const { byId, byNormEmpKey } = await loadLiveFacultyMaps();
    const enriched = enrichCopyrightRecord(existing, byId, byNormEmpKey);

    const access = await checkCopyrightAccess(enriched, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    // Clean up managed local or Drive file
    if (existing.proofSourceType === 'local_upload' && existing.proofFileId) {
      try {
        if (fs.existsSync(existing.proofFileId)) fs.unlinkSync(existing.proofFileId);
      } catch (_) {}
    } else if (existing.proofSourceType === 'drive_upload' && existing.proofFileId) {
      try {
        googleDriveService.deletePatentProofFile(existing.proofFileId).catch(() => {});
      } catch (_) {}
    }

    await CopyrightFaculty.destroy({ where: { copyrightId: existing.id } }).catch(() => {});
    await existing.destroy();

    await logActionSafe({
      recordId: req.params.id,
      title: enriched.title,
      user: req.user,
      action: 'DELETE_COPYRIGHT',
      previousValue: enriched,
      ipAddress: req.ip,
      remarks: `Deleted copyright: ${enriched.title}`
    });

    res.json({ success: true, message: 'Copyright record deleted successfully.' });
  } catch (error) {
    console.error('Delete copyright error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete copyright record.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 4. PROOF FILE UPLOAD & ACCESS-CONTROLLED VIEWING
// ──────────────────────────────────────────────────────────────────────────────
exports.uploadCopyrightProof = async (req, res) => {
  try {
    const existing = await Copyright.findByPk(req.params.id, {
      include: [{ model: CopyrightFaculty, as: 'facultyAssociations' }]
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Copyright record not found.' });
    }

    const { byId, byNormEmpKey } = await loadLiveFacultyMaps();
    const enriched = enrichCopyrightRecord(existing, byId, byNormEmpKey);

    const access = await checkCopyrightAccess(enriched, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const primaryDept = enriched.departments[0] || 'General';

    if (req.file) {
      const file = req.file;
      let uploaded = false;

      if (googleDriveService.isDriveConfigured()) {
        try {
          const driveRes = await googleDriveService.uploadCopyrightProofFile({
            year: existing.calendarYear,
            department: primaryDept,
            fileBuffer: file.buffer,
            fileName: file.originalname,
            mimeType: file.mimetype
          });
          await existing.update({
            proofUrl: driveRes.driveUrl,
            proofSourceType: 'drive_upload',
            proofFileId: driveRes.driveFileId,
            proofFileName: driveRes.fileName,
            proofAccessStatus: 'verified',
            proofAccessRemarks: 'Uploaded to institutional Google Drive'
          });
          uploaded = true;
        } catch (driveErr) {
          console.warn('[CopyrightController] Drive upload fallback:', driveErr.message);
        }
      }

      if (!uploaded) {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        const uploadsDir = path.resolve(__dirname, '../uploads/copyrights', String(existing.calendarYear || 'general'));
        fs.mkdirSync(uploadsDir, { recursive: true });
        const diskPath = path.join(uploadsDir, `${existing.id}_${crypto.randomUUID().slice(0, 8)}_${safeBase}${ext}`);
        fs.writeFileSync(diskPath, file.buffer);

        const host = req.get('host') || 'localhost:5000';
        const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
        const fileUrl = `${protocol}://${host}/api/copyrights/proofs/file/${existing.id}`;

        await existing.update({
          proofUrl: fileUrl,
          proofSourceType: 'local_upload',
          proofFileId: diskPath,
          proofFileName: file.originalname,
          proofAccessStatus: 'verified',
          proofAccessRemarks: 'Stored securely on platform storage'
        });
      }

      return res.json({
        success: true,
        message: 'Proof document uploaded successfully.',
        data: {
          proofUrl: existing.proofUrl,
          proofSourceType: existing.proofSourceType,
          proofFileName: existing.proofFileName,
          proofAccessStatus: existing.proofAccessStatus
        }
      });
    }

    if (req.body && req.body.proofUrl) {
      const check = validateProofUrlInput(req.body.proofUrl);
      if (!check.valid || !check.provided) {
        return res.status(400).json({ success: false, message: check.error || 'Valid Google Drive URL is required.' });
      }
      const ver = await googleDriveService.verifyDriveLinkAccess(check.url);
      await existing.update({
        proofUrl: check.url,
        proofSourceType: 'drive_link',
        proofFileId: check.fileId,
        proofFileName: `Google Drive Document (${(check.fileId || 'link').slice(0, 8)})`,
        proofAccessStatus: ver.status,
        proofAccessRemarks: ver.remarks
      });
      return res.json({ success: true, message: 'Google Drive proof link attached successfully.', data: existing });
    }

    return res.status(400).json({ success: false, message: 'No proof file or Google Drive link provided.' });
  } catch (error) {
    console.error('Upload copyright proof error:', error);
    res.status(500).json({ success: false, message: 'Failed to attach proof document.' });
  }
};

exports.getCopyrightProofFile = async (req, res) => {
  try {
    const existing = await Copyright.findByPk(req.params.id, {
      include: [{ model: CopyrightFaculty, as: 'facultyAssociations' }]
    });
    if (!existing || !existing.proofUrl) {
      return res.status(404).json({ success: false, message: 'Proof document not found.' });
    }

    const { byId, byNormEmpKey } = await loadLiveFacultyMaps();
    const enriched = enrichCopyrightRecord(existing, byId, byNormEmpKey);
    const access = await checkCopyrightAccess(enriched, req.user, 'view');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    if (existing.proofSourceType !== 'local_upload') {
      return res.redirect(existing.proofUrl);
    }

    const filePath = existing.proofFileId;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Proof file not found on storage.' });
    }

    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(existing.proofFileName || 'proof.pdf')}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Get copyright proof file error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve proof document.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 5. BULK EXCEL UPLOAD (Official Template, Parsing, Validation, Duplicate Skip)
// ──────────────────────────────────────────────────────────────────────────────
exports.downloadTemplate = async (req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const rows = [
      ALLOWED_TEMPLATE_COLUMNS,
      [
        'CU001, CU015',
        'Smart Agricultural Monitoring System',
        '15-02-2025',
        'SW-18421/2025',
        '3421/2025-CO/SW',
        '01-03-2025',
        'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view'
      ],
      [
        'CU028',
        'Adaptive Curriculum Analytics Dashboard',
        '20-04-2025',
        '',
        '4890/2025-CO/SW',
        '',
        ''
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 24 }, { wch: 42 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 52 }
    ];
    // Force EmpId column cells to text type so leading zeros are never stripped
    ['A2', 'A3'].forEach(addr => {
      if (ws[addr]) ws[addr].t = 's';
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Copyrights_Template');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="CHRIST_IQAC_Copyrights_Template.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Download copyright template error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel template.' });
  }
};

function normalizeHeaderName(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mapSpreadsheetRow(rawObj) {
  const getVal = (...candidates) => {
    for (const key of Object.keys(rawObj || {})) {
      const norm = normalizeHeaderName(key);
      if (candidates.includes(norm)) return rawObj[key];
    }
    return '';
  };

  return {
    rawEmpId: getVal('empid', 'empids', 'employeeid', 'employeeids', 'facultyid', 'facultyids'),
    title: getVal('title', 'copyrighttitle', 'titleofwork', 'worktitle', 'name'),
    rawDateOfApplication: getVal('dateofapplication', 'applicationdate', 'filingdate', 'appdate'),
    registrationNo: getVal('registrationno', 'regno', 'registrationnumber', 'rocno'),
    diaryNumber: getVal('diarynumber', 'diaryno', 'diaryid'),
    rawDateOfReceipt: getVal('dateofreceipt', 'receiptdate', 'receiveddate'),
    rawProof: getVal('proof', 'prooflink', 'proofurl', 'googledrivelink', 'drivelink', 'driveurl')
  };
}

function validateHeaderColumns(headers = []) {
  const normSet = new Set(headers.map(normalizeHeaderName));
  const missing = [];
  if (!['empid', 'empids', 'employeeid', 'employeeids', 'facultyid', 'facultyids'].some(k => normSet.has(k))) {
    missing.push('EmpId');
  }
  if (!['title', 'copyrighttitle', 'titleofwork', 'worktitle', 'name'].some(k => normSet.has(k))) {
    missing.push('Title');
  }
  if (!['dateofapplication', 'applicationdate', 'filingdate', 'appdate'].some(k => normSet.has(k))) {
    missing.push('Date of Application');
  }
  return missing;
}

/**
 * Core Bulk Preview / Validation Engine (reusable in both Preview, Import, and Automated Tests).
 */
async function evaluateBulkCopyrightRows(rawRows = [], options = {}) {
  const {
    user = null,
    headers = null,
    mockExistingCopyrights = null,
    mockFacultyRows = null,
    verifyDriveLinks = false
  } = options;

  if (Array.isArray(headers) && headers.length > 0) {
    const missingColumns = validateHeaderColumns(headers);
    if (missingColumns.length > 0) {
      return {
        validColumns: false,
        missingColumns,
        summary: {
          totalRows: 0,
          eligibleCount: 0,
          validCleanCount: 0,
          warningInvalidEmpIdCount: 0,
          duplicateCount: 0,
          invalidErrorCount: 0
        },
        rows: []
      };
    }
  }

  // Load existing copyrights for normalized duplicate checking
  let existingSigs = new Set();
  if (Array.isArray(mockExistingCopyrights)) {
    mockExistingCopyrights.forEach(c => {
      const empIds = Array.isArray(c.empIds) ? c.empIds : parseAndNormalizeEmpIds(c.empIdsRaw || c.empIds).empIds;
      existingSigs.add(normalizeDuplicateSignature({
        title: c.title,
        dateOfApplication: c.dateOfApplication,
        empIds
      }));
    });
  } else {
    const dbExisting = await Copyright.findAll({
      attributes: ['id', 'title', 'dateOfApplication', 'empIdsRaw'],
      include: [{ model: CopyrightFaculty, as: 'facultyAssociations', attributes: ['employeeId'] }]
    }).catch(() => []);

    dbExisting.forEach(ex => {
      const exEmpIds = (ex.facultyAssociations && ex.facultyAssociations.length > 0)
        ? ex.facultyAssociations.map(a => a.employeeId)
        : parseAndNormalizeEmpIds(ex.empIdsRaw).empIds;
      existingSigs.add(normalizeDuplicateSignature({
        title: ex.title,
        dateOfApplication: ex.dateOfApplication,
        empIds: exEmpIds
      }));
    });
  }

  // Load Faculty once for fast row resolution
  let preloadedFaculty = mockFacultyRows;
  if (!Array.isArray(preloadedFaculty)) {
    preloadedFaculty = await Faculty.findAll({
      attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email', 'academicYear', 'createdAt'],
      raw: true
    }).catch(() => []);
  }

  const userScope = await resolveUserDeptScope(user);
  const allowedDeptKeys = new Set(userScope.departments.map(normalizeDeptKey).filter(Boolean));
  const seenBatchSigs = new Map(); // sig -> first rowNumber

  const evaluatedRows = [];
  let validCleanCount = 0;
  let warningInvalidEmpIdCount = 0;
  let duplicateCount = 0;
  let invalidErrorCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNumber = raw._rowNumber || (i + 2);
    const mapped = mapSpreadsheetRow(raw);

    const title = String(mapped.title ?? '').trim();
    const rawEmpStr = mapped.rawEmpId !== null && mapped.rawEmpId !== undefined ? String(mapped.rawEmpId).trim() : '';
    const regNo = mapped.registrationNo !== null && mapped.registrationNo !== undefined ? String(mapped.registrationNo).trim() : '';
    const diaryNo = mapped.diaryNumber !== null && mapped.diaryNumber !== undefined ? String(mapped.diaryNumber).trim() : '';
    const proofRaw = mapped.rawProof !== null && mapped.rawProof !== undefined ? String(mapped.rawProof).trim() : '';

    // Skip completely empty rows
    if (!title && !rawEmpStr && isBlankDateValue(mapped.rawDateOfApplication) && !regNo && !diaryNo && !proofRaw) {
      continue;
    }

    const errors = [];
    const warnings = [];

    const parsedEmp = parseAndNormalizeEmpIds(rawEmpStr);
    if (parsedEmp.empIds.length === 0) {
      errors.push('EmpId is required.');
    }
    if (!title) {
      errors.push('Title is required.');
    }

    const isoAppDate = sanitizeDateNoShift(mapped.rawDateOfApplication);
    if (isBlankDateValue(mapped.rawDateOfApplication)) {
      errors.push('Date of Application is required.');
    } else if (!isoAppDate) {
      errors.push(`Invalid Date of Application '${mapped.rawDateOfApplication}'.`);
    }

    let isoReceiptDate = null;
    if (!isBlankDateValue(mapped.rawDateOfReceipt)) {
      isoReceiptDate = sanitizeDateNoShift(mapped.rawDateOfReceipt);
      if (!isoReceiptDate) {
        errors.push(`Invalid Date of Receipt '${mapped.rawDateOfReceipt}'.`);
      }
    }

    // Proof validation (optional; Drive links required if non-empty)
    const proofCheck = validateProofUrlInput(proofRaw);
    let proofAccessStatus = null;
    let proofAccessRemarks = null;
    if (proofCheck.provided && !proofCheck.valid) {
      errors.push(`Invalid Proof Google Drive URL: ${proofCheck.error}`);
    } else if (proofCheck.provided && proofCheck.valid && verifyDriveLinks) {
      const ver = await googleDriveService.verifyDriveLinkAccess(proofCheck.url);
      proofAccessStatus = ver.status;
      proofAccessRemarks = ver.remarks;
      if (ver.status === 'access_issue') {
        warnings.push(`Proof link accessibility warning: ${ver.remarks}`);
      }
    } else if (proofCheck.provided && proofCheck.valid) {
      proofAccessStatus = 'pending_verification';
      proofAccessRemarks = 'Validated Google Drive link format';
    }

    // Faculty resolution (invalid EmpIds are flagged as warnings, NEVER reject record!)
    let resolved = { associations: [], invalidEmpIds: [], hasInvalidEmpIds: false };
    if (parsedEmp.empIds.length > 0) {
      resolved = await resolveFacultyAssociationsForEmpIds(
        parsedEmp.empIds,
        isoAppDate,
        { Faculty, User, UserDepartmentHistory },
        preloadedFaculty
      );
      if (resolved.hasInvalidEmpIds) {
        warnings.push(`Unrecognized EmpId(s) flagged for later correction: ${resolved.invalidEmpIds.join(', ')}`);
      }
      if (parsedEmp.duplicateEmpIds.length > 0) {
        warnings.push(`Duplicate EmpId(s) normalized within row: ${parsedEmp.duplicateEmpIds.join(', ')}`);
      }

      // Check authorized department scope for non-university-wide users
      if (user && !userScope.isUniversityWide && ['coordinator', 'hod', 'faculty'].includes(user.role)) {
        const hasValidFaculty = resolved.associations.some(a => a.isValid);
        const matchesOwnDept = resolved.associations.some(
          a => a.isValid && allowedDeptKeys.has(normalizeDeptKey(a.originalDepartment))
        );
        if (hasValidFaculty && !matchesOwnDept) {
          errors.push(`None of the associated faculty members belong to your authorized department (${userScope.departments.join(', ')}).`);
        }
      }
    }

    // Duplicate detection (if mandatory core fields parse cleanly)
    let isDuplicate = false;
    let duplicateReason = null;
    if (errors.length === 0 && title && isoAppDate && parsedEmp.empIds.length > 0) {
      const sig = normalizeDuplicateSignature({
        title,
        dateOfApplication: isoAppDate,
        empIds: parsedEmp.empIds
      });
      if (existingSigs.has(sig)) {
        isDuplicate = true;
        duplicateReason = 'Matches an existing Copyright record in the database.';
      } else if (seenBatchSigs.has(sig)) {
        isDuplicate = true;
        duplicateReason = `Duplicate of Row ${seenBatchSigs.get(sig)} in the uploaded spreadsheet.`;
      } else {
        seenBatchSigs.set(sig, rowNumber);
      }
    }

    let status = 'valid';
    let eligible = true;
    if (errors.length > 0) {
      status = 'invalid';
      eligible = false;
      invalidErrorCount++;
    } else if (isDuplicate) {
      status = 'duplicate';
      eligible = false;
      duplicateCount++;
    } else if (resolved.hasInvalidEmpIds || warnings.length > 0) {
      status = 'warning';
      eligible = true;
      warningInvalidEmpIdCount++;
    } else {
      validCleanCount++;
    }

    evaluatedRows.push({
      rowNumber,
      status,
      eligible,
      isDuplicate,
      duplicateReason,
      errors,
      warnings,
      normalized: {
        title,
        empIds: parsedEmp.empIds,
        empIdsRaw: parsedEmp.empIdsRaw,
        dateOfApplication: isoAppDate,
        calendarYear: deriveCalendarYear(isoAppDate),
        registrationNo: regNo || null,
        diaryNumber: diaryNo || null,
        dateOfReceipt: isoReceiptDate,
        proofUrl: proofCheck.provided && proofCheck.valid ? proofCheck.url : null,
        proofFileId: proofCheck.provided && proofCheck.valid ? proofCheck.fileId : null,
        proofAccessStatus,
        proofAccessRemarks,
        associations: resolved.associations,
        invalidEmpIds: resolved.invalidEmpIds,
        duplicateEmpIds: parsedEmp.duplicateEmpIds,
        hasInvalidEmpIds: resolved.hasInvalidEmpIds
      }
    });
  }

  return {
    validColumns: true,
    missingColumns: [],
    summary: {
      totalRows: evaluatedRows.length,
      eligibleCount: validCleanCount + warningInvalidEmpIdCount,
      validCleanCount,
      warningInvalidEmpIdCount,
      duplicateCount,
      invalidErrorCount
    },
    rows: evaluatedRows
  };
}

function parseUploadedSpreadsheetBuffer(fileBuffer) {
  const wb = XLSX.read(fileBuffer, { type: 'buffer', raw: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
  if (!aoa || aoa.length === 0) return { headers: [], rows: [] };
  const headers = aoa[0].map(h => String(h ?? '').trim());
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  return { headers, rows };
}

exports.previewBulkUpload = async (req, res) => {
  try {
    let rows = req.body.rows;
    let headers = req.body.headers || null;

    if (req.file && req.file.buffer) {
      const parsed = parseUploadedSpreadsheetBuffer(req.file.buffer);
      headers = parsed.headers;
      rows = parsed.rows;
    }

    if (!Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'No spreadsheet file or rows provided.' });
    }

    const result = await evaluateBulkCopyrightRows(rows, {
      user: req.user,
      headers,
      verifyDriveLinks: googleDriveService.isDriveConfigured()
    });

    if (!result.validColumns) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_REQUIRED_COLUMNS',
        message: `Spreadsheet is missing required columns: ${result.missingColumns.join(', ')}`,
        missingColumns: result.missingColumns
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Preview copyright bulk upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to parse bulk spreadsheet.' });
  }
};

exports.importBulkUpload = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let rows = req.body.rows;
    let headers = req.body.headers || null;

    if (req.file && req.file.buffer) {
      const parsed = parseUploadedSpreadsheetBuffer(req.file.buffer);
      headers = parsed.headers;
      rows = parsed.rows;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'No copyright rows provided for import.' });
    }

    const evaluation = await evaluateBulkCopyrightRows(rows, {
      user: req.user,
      headers,
      verifyDriveLinks: googleDriveService.isDriveConfigured()
    });

    if (!evaluation.validColumns) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'MISSING_REQUIRED_COLUMNS',
        message: `Missing required columns: ${evaluation.missingColumns.join(', ')}`
      });
    }

    let importedCount = 0;
    let importedWithWarningsCount = 0;
    let skippedDuplicatesCount = 0;
    let rejectedMandatoryCount = 0;
    let rejectedValidationCount = 0;
    const rowResults = [];

    for (const row of evaluation.rows) {
      const n = row.normalized;
      if (row.isDuplicate) {
        skippedDuplicatesCount++;
        rowResults.push({
          rowNumber: row.rowNumber,
          status: 'skipped_duplicate',
          title: n.title,
          empIds: n.empIdsRaw,
          reason: row.duplicateReason
        });
        continue;
      }

      if (!row.eligible) {
        const hasMandErr = row.errors.some(e => /required/i.test(e));
        if (hasMandErr) rejectedMandatoryCount++;
        else rejectedValidationCount++;
        rowResults.push({
          rowNumber: row.rowNumber,
          status: 'rejected',
          title: n.title,
          empIds: n.empIdsRaw,
          reason: row.errors.join('; ')
        });
        continue;
      }

      const effectiveStatus = n.registrationNo ? 'registered' : 'submitted';
      const created = await Copyright.create({
        title: n.title,
        empIdsRaw: n.empIdsRaw,
        dateOfApplication: n.dateOfApplication,
        calendarYear: n.calendarYear,
        registrationNo: n.registrationNo,
        diaryNumber: n.diaryNumber,
        dateOfReceipt: n.dateOfReceipt,
        status: effectiveStatus,
        proofUrl: n.proofUrl,
        proofSourceType: n.proofUrl ? 'drive_link' : null,
        proofFileId: n.proofFileId,
        proofFileName: n.proofUrl ? `Google Drive Document (${(n.proofFileId || 'link').slice(0, 8)})` : null,
        proofAccessStatus: n.proofAccessStatus,
        proofAccessRemarks: n.proofAccessRemarks,
        hasInvalidEmpIds: n.hasInvalidEmpIds,
        invalidEmpIds: n.invalidEmpIds,
        duplicateEmpIds: n.duplicateEmpIds,
        createdBy: req.user?.id || null
      }, { transaction: t });

      await CopyrightFaculty.bulkCreate(
        n.associations.map(a => ({ ...a, copyrightId: created.id })),
        { transaction: t }
      );

      importedCount++;
      if (n.hasInvalidEmpIds) importedWithWarningsCount++;

      rowResults.push({
        rowNumber: row.rowNumber,
        status: n.hasInvalidEmpIds ? 'imported_with_warning' : 'imported',
        copyrightId: created.id,
        title: n.title,
        empIds: n.empIdsRaw,
        warnings: row.warnings
      });
    }

    await t.commit();

    await logActionSafe({
      user: req.user,
      action: 'BULK_UPLOAD_COPYRIGHTS',
      title: `Bulk imported ${importedCount} copyright records`,
      updatedValue: {
        totalRows: evaluation.rows.length,
        importedCount,
        skippedDuplicatesCount,
        importedWithWarningsCount,
        rejectedMandatoryCount,
        rejectedValidationCount
      },
      ipAddress: req.ip,
      remarks: `Bulk upload completed: ${importedCount} imported, ${skippedDuplicatesCount} duplicates skipped`
    });

    res.status(201).json({
      success: true,
      message: `Import complete: ${importedCount} copyright(s) imported, ${skippedDuplicatesCount} duplicate(s) skipped.`,
      summary: {
        totalRows: evaluation.rows.length,
        importedCount,
        skippedDuplicatesCount,
        importedWithInvalidEmpIdsCount: importedWithWarningsCount,
        rejectedMandatoryCount,
        rejectedValidationCount
      },
      rowResults
    });
  } catch (error) {
    try { await t.rollback(); } catch (_) {}
    console.error('Import copyright bulk error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to complete bulk copyright import.' });
  }
};

exports._testHelpers = {
  evaluateBulkCopyrightRows,
  validateHeaderColumns,
  parseUploadedSpreadsheetBuffer,
  checkCopyrightAccess
};

