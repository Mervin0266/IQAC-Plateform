'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Patent, PatentProof, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction, logActionSafe } = require('../middleware/auditLogger');
const { sendNotification } = require('../middleware/notificationHelper');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { parsePagination, formatPaginationResponse } = require('../utils/paginationHelper');
const googleDriveService = require('../services/googleDriveService');

/**
 * Sanitize and normalize date string into ISO YYYY-MM-DD.
 */
const sanitizeDate = (val) => {
  if (!val) return null;

  // Handle Excel numeric serial dates (e.g. 45123)
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  const lower = str.toLowerCase();
  if (['n/a', 'na', 'nil', 'null', '-', '--', 'pending', 'under examination', 'not applicable', 'none', 'tbd', 'ongoing'].includes(lower)) {
    return null;
  }

  // If numeric string of Excel serial date (4-5 digits)
  if (/^\d{4,5}$/.test(str) && parseInt(str, 10) > 10000) {
    const num = parseInt(str, 10);
    const d = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  // Standard ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Handle DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let p1 = parts[0].trim();
    let p2 = parts[1].trim();
    let p3 = parts[2].trim();

    // Check if format is YYYY-MM-DD
    if (p1.length === 4) {
      const y = p1;
      const m = p2.padStart(2, '0');
      const d = p3.padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Otherwise assume DD-MM-YYYY
    let day = p1.padStart(2, '0');
    let month = p2.padStart(2, '0');
    let year = p3;
    if (year.length === 2) year = '20' + year;
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // Handle YYYY only (e.g. "2024")
  if (/^\d{4}$/.test(str)) {
    return `${str}-01-01`;
  }

  // General fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
};

const sanitizeAmount = (val) => {
  if (val === null || val === undefined || val === '') return 0.00;
  if (typeof val === 'number') return isNaN(val) ? 0.00 : val;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0.00 : parsed;
};

/**
 * Validate Year of Grant against Patent Status and Grant Date.
 * Rules:
 * - Filed / Under Examination / Published: Year must be blank/null.
 * - Granted / Commercialized: Year is required (4-digit calendar year e.g. 2024).
 * - When Grant Date is entered, Year must match the year part of Grant Date.
 */
const validateYearAndStatus = (status, grantDate, rawYear) => {
  const normStatus = (status || '').toLowerCase().trim();
  const isGranted = normStatus.includes('grant') || normStatus.includes('commercial') || normStatus.includes('licens');

  const sanitizedGrantDate = sanitizeDate(grantDate);
  let parsedYear = null;
  let rawYearInvalid = false;

  if (rawYear !== null && rawYear !== undefined && String(rawYear).trim() !== '') {
    const yrStr = String(rawYear).trim().toLowerCase();
    if (!['pending', 'pending grant', 'n/a', 'na', 'nil', '-', '--', 'null'].includes(yrStr)) {
      if (/^\d{4}$/.test(yrStr)) {
        parsedYear = parseInt(yrStr, 10);
      } else if (yrStr.includes('-')) {
        const parts = yrStr.split('-');
        if (/^\d{4}$/.test(parts[0].trim())) {
          parsedYear = parseInt(parts[0].trim(), 10);
        } else {
          rawYearInvalid = true;
        }
      } else {
        rawYearInvalid = true;
      }
    }
  }

  if (isGranted) {
    if (rawYearInvalid) {
      return {
        valid: false,
        error: 'Year of Grant must be a valid 4-digit calendar year (e.g. 2024).'
      };
    }

    if (!parsedYear) {
      return {
        valid: false,
        error: 'Year of Grant (4-digit calendar year e.g. 2024) is required for Granted and Commercialized patents.'
      };
    }

    if (parsedYear < 1950 || parsedYear > 2100) {
      return {
        valid: false,
        error: `Invalid Year of Grant: ${parsedYear}. Must be a valid 4-digit calendar year.`
      };
    }

    if (sanitizedGrantDate) {
      const derivedYearFromDate = parseInt(sanitizedGrantDate.split('-')[0], 10);
      if (derivedYearFromDate !== parsedYear) {
        return {
          valid: false,
          error: `Year of Grant (${parsedYear}) does not match Grant Date year (${derivedYearFromDate}). Both must agree.`
        };
      }
    }

    return {
      valid: true,
      grantYear: parsedYear,
      academicYear: `${parsedYear}-${parsedYear + 1}`
    };
  } else {
    // Non-granted (Filed, Published, Under Examination)
    if (parsedYear !== null || rawYearInvalid) {
      return {
        valid: false,
        error: `Year of Grant must be left blank for ungranted patents (Status: ${status}). Year is assigned only upon grant.`
      };
    }

    return {
      valid: true,
      grantYear: null,
      academicYear: 'Pending Grant'
    };
  }
};

/**
 * Enforce role & department permissions on patent records.
 */
const checkPatentAccess = (patent, user, action = 'view') => {
  if (!user) return { allowed: false, message: 'Authentication required' };
  if (user.role === 'admin') return { allowed: true };

  if (action === 'view') {
    if (user.role === 'authority') return { allowed: true };
    if (['coordinator', 'hod'].includes(user.role)) {
      if (!user.department || user.department === 'All' || patent.department === user.department) {
        return { allowed: true };
      }
      return { allowed: false, message: 'Access denied: Patent belongs to another department' };
    }
    if (user.role === 'faculty') {
      if (!user.department || patent.department === user.department || patent.createdBy === user.id) {
        return { allowed: true };
      }
      return { allowed: false, message: 'Access denied: Patent belongs to another department' };
    }
  }

  // Edit / Delete / Manage Proofs
  if (action === 'manage') {
    if (user.role === 'authority') {
      return { allowed: false, message: 'Authority role has read-only inspection access.' };
    }
    if (['coordinator', 'hod'].includes(user.role)) {
      if (!user.department || user.department === 'All' || patent.department === user.department) {
        return { allowed: true };
      }
      return { allowed: false, message: 'Access denied: Cannot modify patents outside your department.' };
    }
    if (user.role === 'faculty') {
      if (patent.createdBy === user.id) {
        return { allowed: true };
      }
      return { allowed: false, message: 'Access denied: Faculty can only modify their own patent records.' };
    }
  }

  return { allowed: false, message: 'Unauthorized action' };
};

// @desc    Get all patents with filtering, searching, proofs, and role isolation
// @route   GET /api/patents
// @access  Private
exports.getPatents = async (req, res) => {
  try {
    const {
      status,
      patentType,
      year,
      grantYear,
      academicYear,
      department,
      proofStatus,
      search
    } = req.query;

    const where = {};
    const selectedYear = year || grantYear || academicYear;

    if (status && status !== 'all') {
      where.status = {
        [Op.iLike]: `%${status.trim()}%`
      };
    }

    if (patentType && patentType !== 'all') {
      where.patentType = {
        [Op.iLike]: `%${patentType.trim()}%`
      };
    }

    if (selectedYear && selectedYear !== 'all') {
      const yrTrim = String(selectedYear).trim();
      if (yrTrim === 'Pending Grant' || yrTrim.toLowerCase() === 'unassigned' || yrTrim.toLowerCase() === 'blank') {
        where.grantYear = null;
      } else if (/^\d{4}$/.test(yrTrim)) {
        const yrInt = parseInt(yrTrim, 10);
        where[Op.or] = [
          { grantYear: yrInt },
          { academicYear: { [Op.iLike]: `%${yrTrim}%` } }
        ];
      } else {
        where.academicYear = yrTrim;
      }
    }

    // Role-based data isolation
    if (req.user) {
      if (req.user.role === 'coordinator' || req.user.role === 'hod') {
        if (req.user.department && req.user.department !== 'All') {
          where.department = {
            [Op.iLike]: `%${req.user.department}%`
          };
        }
      } else if (req.user.role === 'authority') {
        where.approvalStatus = 'finalized';
      }
    }

    // Explicit department filter
    if (department && department !== 'all') {
      where.department = {
        [Op.iLike]: `%${department.replace(/-/g, '%')}%`
      };
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { title: { [Op.iLike]: q } },
        { inventors: { [Op.iLike]: q } },
        { applicationNo: { [Op.iLike]: q } },
        { patentNo: { [Op.iLike]: q } },
        { department: { [Op.iLike]: q } },
        { partner: { [Op.iLike]: q } },
        { patentType: { [Op.iLike]: q } }
      ];
    }

    const { page, limit, offset, isExport } = parsePagination(req.query);

    const { count, rows: patents } = await Patent.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: PatentProof,
          as: 'proofs',
          where: { isActive: true },
          required: false,
          attributes: [
            'id', 'sourceType', 'driveFileId', 'driveFolderId',
            'driveUrl', 'fileName', 'mimeType', 'fileSize',
            'uploadedAt', 'accessStatus', 'accessRemarks'
          ]
        }
      ],
      order: [
        ['grantYear', 'DESC NULLS LAST'],
        ['academicYear', 'DESC'],
        ['filedDate', 'DESC NULLS LAST'],
        ['id', 'ASC']
      ],
      limit: isExport ? undefined : limit,
      offset: isExport ? undefined : offset,
      distinct: true
    });

    // Optional Proof Status filter in memory if specified
    let filteredRows = patents;
    if (proofStatus && proofStatus !== 'all') {
      filteredRows = patents.filter(p => {
        const proofs = p.proofs || [];
        if (proofStatus === 'missing') return proofs.length === 0;
        if (proofStatus === 'verified') return proofs.some(pr => pr.accessStatus === 'verified');
        if (proofStatus === 'issue') return proofs.some(pr => pr.accessStatus === 'access_issue');
        if (proofStatus === 'has_proof') return proofs.length > 0;
        return true;
      });
    }

    res.json(formatPaginationResponse({
      count: proofStatus && proofStatus !== 'all' ? filteredRows.length : count,
      rows: filteredRows,
      page,
      limit
    }));
  } catch (error) {
    console.error('Get patents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve patent records',
      error: error.message
    });
  }
};

// @desc    Get aggregate patent statistics (including Proof & Grant Year breakdowns)
// @route   GET /api/patents/stats
// @access  Private / Public
exports.getPatentStats = async (req, res) => {
  try {
    const { year, department } = req.query;
    const where = {};

    if (year && year !== 'all') {
      const yrTrim = String(year).trim();
      if (/^\d{4}$/.test(yrTrim)) {
        where[Op.or] = [
          { grantYear: parseInt(yrTrim, 10) },
          { academicYear: { [Op.iLike]: `%${yrTrim}%` } }
        ];
      } else {
        where.academicYear = yrTrim;
      }
    }

    if (department && department !== 'all') {
      where.department = { [Op.iLike]: `%${department}%` };
    }

    const allPatents = await Patent.findAll({
      where,
      include: [{
        model: PatentProof,
        as: 'proofs',
        where: { isActive: true },
        required: false,
        attributes: ['id', 'accessStatus']
      }]
    });

    let filedCount = 0;
    let publishedCount = 0;
    let grantedCount = 0;
    let commercializedCount = 0;
    let totalRevenue = 0;
    let nationalCount = 0;
    let internationalCount = 0;
    let withProofCount = 0;
    let missingProofCount = 0;

    const departmentBreakdown = {};
    const yearBreakdown = {};

    allPatents.forEach(p => {
      const s = (p.status || '').toLowerCase();
      if (s.includes('commercial') || s.includes('licens')) {
        commercializedCount++;
      } else if (s.includes('grant')) {
        grantedCount++;
      } else if (s.includes('publish')) {
        publishedCount++;
      } else {
        filedCount++;
      }

      const pType = (p.patentType || '').toLowerCase();
      if (pType.includes('international') || pType.includes('pct') || pType.includes('uspto') || pType.includes('epo')) {
        internationalCount++;
      } else {
        nationalCount++;
      }

      totalRevenue += Number(p.revenue) || 0;

      const dept = p.department || 'Unassigned';
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;

      // Year breakdown: Prefer grantYear; for ungranted use 'Pending Grant'
      const yrKey = p.grantYear ? String(p.grantYear) : (p.status === 'granted' || p.status === 'commercialized' ? (p.academicYear || 'Unknown') : 'Pending Grant');
      yearBreakdown[yrKey] = (yearBreakdown[yrKey] || 0) + 1;

      const proofs = p.proofs || [];
      if (proofs.length > 0) {
        withProofCount++;
      } else {
        missingProofCount++;
      }
    });

    res.json({
      success: true,
      data: {
        total: allPatents.length,
        filed: filedCount,
        published: publishedCount,
        granted: grantedCount,
        commercialized: commercializedCount,
        national: nationalCount,
        international: internationalCount,
        totalRevenue,
        withProofCount,
        missingProofCount,
        departmentBreakdown,
        yearBreakdown
      }
    });
  } catch (error) {
    console.error('Get patent stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate patent statistics',
      error: error.message
    });
  }
};

// @desc    Get single patent by ID with active Proofs
// @route   GET /api/patents/:id
// @access  Private
exports.getPatent = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: PatentProof,
          as: 'proofs',
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!patent) {
      return res.status(404).json({
        success: false,
        message: 'Patent record not found'
      });
    }

    const access = checkPatentAccess(patent, req.user, 'view');
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message
      });
    }

    res.json({
      success: true,
      data: patent
    });
  } catch (error) {
    console.error('Get patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new patent record with optional Proof attachments or links
// @route   POST /api/patents
// @access  Private
exports.createPatent = async (req, res) => {
  try {
    const {
      title,
      inventors,
      applicationNo,
      patentNo,
      status,
      patentType,
      department,
      year,
      grantYear,
      academicYear,
      filedDate,
      publishedDate,
      grantedDate,
      licenseDate,
      partner,
      revenue,
      patentUrl,
      description,
      approvalStatus,
      proofLinks
    } = req.body;

    // Validation for required fields
    const missing = [];
    if (!title || !String(title).trim()) missing.push('Patent Title');
    if (!inventors || (Array.isArray(inventors) ? inventors.length === 0 : !String(inventors).trim())) missing.push('Inventor Name(s)');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Missing required field(s): ${missing.join(', ')}.`,
        missingFields: missing
      });
    }

    // Validate Year of Grant
    const isGranted = (status || '').toLowerCase().includes('grant') || 
                      (status || '').toLowerCase().includes('commercial') || 
                      (status || '').toLowerCase().includes('licens');

    // For granted patents, validate year/grantYear (fallback to academicYear if passed);
    // For ungranted patents (Published, Filed, Under Examination), Year of Grant must be null
    const yearToValidate = isGranted 
      ? (year !== undefined && year !== null && String(year).trim() !== '' ? year : (grantYear || academicYear))
      : (year !== undefined && year !== null && String(year).trim() !== '' ? year : (grantYear || null));

    const yearValidation = validateYearAndStatus(status, grantedDate, yearToValidate);
    if (!yearValidation.valid) {
      return res.status(400).json({
        success: false,
        message: yearValidation.error
      });
    }

    const rawInventors = Array.isArray(inventors) ? inventors.join(', ') : String(inventors);
    const assignedDept = req.user?.role === 'admin' ? (department || 'General') : (req.user?.department || 'General');
    const finalApproval = (['admin', 'coordinator', 'hod'].includes(req.user?.role) && approvalStatus)
      ? approvalStatus
      : (req.user?.role === 'admin' ? 'approved' : 'submitted');

    let creatorId = req.user?.id;
    if (!creatorId) {
      const admin = await User.findOne({ where: { role: 'admin' } });
      creatorId = admin ? admin.id : null;
    }

    const patent = await Patent.create({
      title: title.trim(),
      inventors: rawInventors.trim(),
      applicationNo: applicationNo ? applicationNo.trim() : null,
      patentNo: patentNo ? patentNo.trim() : null,
      status: status || 'published',
      patentType: patentType || 'National (Indian)',
      department: assignedDept.trim(),
      grantYear: isGranted ? yearValidation.grantYear : null,
      academicYear: isGranted ? yearValidation.academicYear : (academicYear || 'Pending Grant'),
      filedDate: sanitizeDate(filedDate),
      publishedDate: sanitizeDate(publishedDate),
      grantedDate: sanitizeDate(grantedDate),
      licenseDate: sanitizeDate(licenseDate),
      partner: partner ? partner.trim() : null,
      revenue: sanitizeAmount(revenue),
      patentUrl: patentUrl ? patentUrl.trim() : null,
      description: description ? description.trim() : null,
      approvalStatus: finalApproval,
      createdBy: creatorId
    });

    // Save any initial Proof Google Drive links provided during Single Entry
    if (proofLinks) {
      const linkList = Array.isArray(proofLinks)
        ? proofLinks
        : String(proofLinks).split('\n');

      for (const rawUrl of linkList) {
        const u = rawUrl.trim();
        if (!u) continue;
        const validation = googleDriveService.validateDriveUrl(u);
        if (validation.valid) {
          const verification = await googleDriveService.verifyDriveLinkAccess(u);
          await PatentProof.create({
            patentId: patent.id,
            sourceType: 'drive_link',
            driveFileId: validation.fileId,
            driveUrl: u,
            fileName: verification.fileName || `Google Drive Document (${validation.fileId.slice(0, 8)})`,
            mimeType: verification.mimeType || 'application/vnd.google-apps.document',
            fileSize: verification.fileSize || null,
            uploadedBy: creatorId,
            accessStatus: verification.status,
            accessRemarks: verification.remarks,
            isActive: true
          });
        }
      }
    }

    await logActionSafe({
      recordId: patent.id,
      title: patent.title,
      user: req.user,
      action: 'CREATE_PATENT',
      previousValue: null,
      updatedValue: patent.toJSON(),
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Created patent: ${patent.title}`
    });

    const reloaded = await Patent.findByPk(patent.id, {
      include: [{
        model: PatentProof,
        as: 'proofs',
        where: { isActive: true },
        required: false
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Patent record created successfully',
      data: reloaded || patent
    });
  } catch (error) {
    console.error('Create patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create patent',
      error: error.message
    });
  }
};

// @desc    Update patent record & handle folder relocation on Grant Year change
// @route   PUT /api/patents/:id
// @access  Private
exports.updatePatent = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id, {
      include: [{
        model: PatentProof,
        as: 'proofs',
        where: { isActive: true },
        required: false
      }]
    });

    if (!patent) {
      return res.status(404).json({
        success: false,
        message: 'Patent not found'
      });
    }

    const access = checkPatentAccess(patent, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message
      });
    }

    const oldValues = patent.toJSON();
    const oldGrantYear = patent.grantYear;
    const oldStatus = patent.status;

    // Validate Year & Status if modified
    const targetStatus = req.body.status !== undefined ? req.body.status : patent.status;
    const isTargetGranted = (targetStatus || '').toLowerCase().includes('grant') || 
                            (targetStatus || '').toLowerCase().includes('commercial') || 
                            (targetStatus || '').toLowerCase().includes('licens');
    const targetGrantDate = req.body.grantedDate !== undefined ? req.body.grantedDate : patent.grantedDate;

    let targetYear = null;
    if (isTargetGranted) {
      targetYear = req.body.year !== undefined ? req.body.year : (req.body.grantYear !== undefined ? req.body.grantYear : patent.grantYear);
    } else {
      // Ungranted: Year of Grant must be null
      targetYear = (req.body.grantYear !== undefined && req.body.grantYear !== null && String(req.body.grantYear).trim() !== '') 
        ? req.body.grantYear 
        : ((req.body.year !== undefined && req.body.year !== null && String(req.body.year).trim() !== '') ? req.body.year : null);
    }

    const yearValidation = validateYearAndStatus(targetStatus, targetGrantDate, targetYear);
    if (!yearValidation.valid) {
      return res.status(400).json({
        success: false,
        message: yearValidation.error
      });
    }

    const allowedFields = [
      'title', 'inventors', 'applicationNo', 'patentNo', 'status', 'patentType',
      'filedDate', 'publishedDate', 'grantedDate', 'licenseDate',
      'partner', 'revenue', 'patentUrl', 'description'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'inventors' && Array.isArray(req.body.inventors)) {
          patent.inventors = req.body.inventors.join(', ');
        } else if (['filedDate', 'publishedDate', 'grantedDate', 'licenseDate'].includes(field)) {
          patent[field] = sanitizeDate(req.body[field]);
        } else if (field === 'revenue') {
          patent.revenue = sanitizeAmount(req.body[field]);
        } else {
          patent[field] = req.body[field];
        }
      }
    });

    patent.grantYear = isTargetGranted ? yearValidation.grantYear : null;
    patent.academicYear = isTargetGranted ? yearValidation.academicYear : (req.body.academicYear || patent.academicYear || 'Pending Grant');

    // Only coordinator, hod, and admin can change approval status
    if (['admin', 'coordinator', 'hod'].includes(req.user.role) && req.body.approvalStatus !== undefined) {
      patent.approvalStatus = req.body.approvalStatus;
    }

    // Only admin can change department
    if (req.user.role === 'admin' && req.body.department !== undefined) {
      patent.department = req.body.department;
    }

    await patent.save();

    // Check if institutional Drive folder needs relocation due to status change to Granted or Grant Year correction
    if (
      (oldStatus !== patent.status || oldGrantYear !== patent.grantYear) &&
      patent.proofs && patent.proofs.some(p => p.sourceType === 'drive_upload' && p.driveFolderId)
    ) {
      const managedProof = patent.proofs.find(p => p.driveFolderId);
      if (managedProof && managedProof.driveFolderId) {
        googleDriveService.relocatePatentFolder({
          currentPatentFolderId: managedProof.driveFolderId,
          newYear: patent.grantYear,
          department: patent.department,
          patentId: patent.id
        }).catch(err => console.warn('[Relocation] Background relocation warning:', err.message));
      }
    }

    await logActionSafe({
      recordId: patent.id,
      title: patent.title,
      user: req.user,
      action: 'UPDATE_PATENT',
      previousValue: oldValues,
      updatedValue: patent.toJSON(),
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Updated patent: ${patent.title}`
    });

    res.json({
      success: true,
      message: 'Patent updated successfully',
      data: patent
    });
  } catch (error) {
    console.error('Update patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update patent',
      error: error.message
    });
  }
};

// @desc    Delete patent & clean up managed Drive proofs
// @route   DELETE /api/patents/:id
// @access  Private
exports.deletePatent = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id, {
      include: [{
        model: PatentProof,
        as: 'proofs',
        where: { isActive: true },
        required: false
      }]
    });

    if (!patent) {
      return res.status(404).json({
        success: false,
        message: 'Patent not found'
      });
    }

    const access = checkPatentAccess(patent, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message
      });
    }

    const oldValues = patent.toJSON();

    // 1. Clean up managed files from Google Drive or local server storage
    if (patent.proofs && patent.proofs.length > 0) {
      for (const proof of patent.proofs) {
        if (proof.sourceType === 'local_upload' && proof.driveFileId) {
          try {
            if (fs.existsSync(proof.driveFileId)) fs.unlinkSync(proof.driveFileId);
          } catch (_) {}
        } else if (proof.sourceType === 'drive_upload' && proof.driveFileId) {
          try {
            googleDriveService.deletePatentProofFile(proof.driveFileId).catch(() => {});
          } catch (_) {}
        }
      }
    }

    // 2. Explicitly remove all proof records from database to prevent foreign key constraint issues
    try {
      await PatentProof.destroy({ where: { patentId: patent.id } });
    } catch (proofErr) {
      console.warn('[PatentController] Notice during proof cleanup:', proofErr.message);
    }

    // 3. Delete patent record
    await patent.destroy();

    // 4. Safe audit logging
    await logActionSafe({
      recordId: req.params.id,
      title: oldValues.title || 'Patent',
      user: req.user,
      action: 'DELETE_PATENT',
      previousValue: oldValues,
      updatedValue: null,
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Deleted patent: ${oldValues.title || req.params.id}`
    });

    res.json({
      success: true,
      message: 'Patent deleted successfully'
    });
  } catch (error) {
    console.error('Delete patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete patent',
      error: error.message
    });
  }
};

// @desc    Bulk Upload Patents (from parsed CSV / Excel with Google Drive Proof links)
// @route   POST /api/patents/bulk
// @access  Private (Admin, HOD, Coordinator, Faculty)
exports.bulkUploadPatents = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, defaultDepartment, defaultYear } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No patent items provided for bulk upload.'
      });
    }

    let creatorId = req.user?.id;
    if (!creatorId) {
      const admin = await User.findOne({ where: { role: 'admin' } });
      creatorId = admin ? admin.id : null;
    }

    const validRecords = [];
    const recordProofLinks = [];
    const errors = [];

    items.forEach((item, index) => {
      const rowNum = index + 1;
      const title = extractField(
        item,
        'title', 'patentTitle', 'titleOfInvention', 'inventionTitle',
        'nameOfInvention', 'patentName', 'titleOfPatent', 'nameOfTheInvention',
        'nameOfProject', 'projectName', 'projectTitle', 'workTitle', 'invention'
      );
      const rawInventors = extractField(
        item,
        'inventors', 'inventorName', 'inventorNames', 'nameOfInventors',
        'nameOfTheInventors', 'authors', 'authorName', 'facultyName',
        'nameOfFaculty', 'faculty', 'investigators', 'investigatorName',
        'applicant', 'applicants', 'nameOfApplicant'
      );
      const applicationNo = extractField(
        item,
        'applicationNo', 'applicationNumber', 'appNo', 'appNumber',
        'applicationId', 'applNo', 'applNumber', 'filingNo', 'filingNumber'
      );
      const patentNo = extractField(
        item,
        'patentNo', 'patentNumber', 'grantNo', 'grantNumber', 'awardNo', 'patentGrantNo'
      );
      const rawStatus = extractField(
        item,
        'status', 'patentStatus', 'stage', 'currentStatus', 'filingStatus', 'progressStatus'
      ) || 'Published';
      const rawType = extractField(
        item,
        'patentType', 'type', 'jurisdiction', 'typeOfPatent', 'category', 'patentCategory'
      ) || 'National (Indian)';
      const rawYear = extractField(
        item,
        'year', 'grantYear', 'yearOfGrant', 'academicYear', 'ay', 'period'
      ) || defaultYear;
      const department = extractField(
        item,
        'department', 'dept', 'hostDepartment', 'departmentName', 'school', 'branch'
      ) || defaultDepartment || req.user?.department || 'General';
      const filedDate = extractField(
        item,
        'filedDate', 'filingDate', 'dateOfFiling', 'applicationDate', 'dateOfApplication'
      );
      const publishedDate = extractField(
        item,
        'publishedDate', 'publicationDate', 'dateOfPublication', 'dateOfPublishing'
      );
      const grantedDate = extractField(
        item,
        'grantedDate', 'grantDate', 'dateOfGrant', 'awardDate', 'dateOfAward'
      );
      const licenseDate = extractField(
        item,
        'licenseDate', 'commercializedDate', 'commercializationDate', 'dateOfCommercialization'
      );
      const partner = extractField(
        item,
        'partner', 'commercialPartner', 'licensee', 'industryPartner', 'collaboratingIndustry', 'collaborator'
      );
      const revenue = extractField(
        item,
        'revenue', 'revenueGenerated', 'royalty', 'amount', 'earnings', 'revenueInr', 'revenueInLakhs'
      );
      const patentUrl = extractField(
        item,
        'patentUrl', 'patentLink', 'url', 'link', 'documentUrl', 'gazetteUrl', 'googlePatentsLink'
      );
      const rawProof = extractField(
        item,
        'proof', 'proofs', 'proofUrl', 'proofUrls', 'driveUrl', 'googleDrive', 'googleDriveLink', 'proofDocuments'
      );
      const description = extractField(
        item,
        'description', 'abstract', 'summary', 'claims', 'briefDescription'
      );

      // Silently skip completely blank row
      if (!String(title).trim() && !String(rawInventors).trim() && !String(applicationNo).trim() && !String(patentNo).trim()) {
        return;
      }

      if (!String(title).trim()) {
        errors.push(`Row ${rowNum}: Patent Title is required.`);
        return;
      }
      if (!String(rawInventors).trim()) {
        errors.push(`Row ${rowNum}: Inventor Name(s) are required for "${String(title).trim()}".`);
        return;
      }

      // Department authorization check
      if (req.user && ['coordinator', 'hod'].includes(req.user.role)) {
        if (req.user.department && req.user.department !== 'All' && String(department).trim() !== req.user.department) {
          errors.push(`Row ${rowNum}: Department '${department}' is outside your authorized scope (${req.user.department}).`);
          return;
        }
      }

      // Normalize status
      let normalizedStatus = String(rawStatus).trim().toLowerCase();
      if (normalizedStatus.includes('commercial') || normalizedStatus.includes('license')) {
        normalizedStatus = 'commercialized';
      } else if (normalizedStatus.includes('grant')) {
        normalizedStatus = 'granted';
      } else if (normalizedStatus.includes('publish')) {
        normalizedStatus = 'published';
      } else if (normalizedStatus.includes('exam')) {
        normalizedStatus = 'under_examination';
      } else {
        normalizedStatus = 'filed';
      }

      // Year of Grant validation
      const yearValidation = validateYearAndStatus(normalizedStatus, grantedDate, rawYear);
      if (!yearValidation.valid) {
        errors.push(`Row ${rowNum} ("${String(title).trim().slice(0, 30)}..."): ${yearValidation.error}`);
        return;
      }

      // Validate Google Drive Proof links (if provided in Proof cell)
      const validProofUrlsForRow = [];
      if (rawProof && String(rawProof).trim()) {
        // Split on newlines or commas
        const candidateLinks = String(rawProof).split(/[\n,]+/);
        for (const cl of candidateLinks) {
          const trimmedLink = cl.trim();
          if (!trimmedLink) continue;
          const v = googleDriveService.validateDriveUrl(trimmedLink);
          if (v.valid) {
            validProofUrlsForRow.push({
              url: v.sanitizedUrl,
              fileId: v.fileId
            });
          } else {
            errors.push(`Row ${rowNum}: Invalid Google Drive Proof URL '${trimmedLink}' (${v.error}).`);
            return;
          }
        }
      }

      // Normalize patent type
      let normalizedType = String(rawType).trim();
      const lowerType = normalizedType.toLowerCase();
      if (lowerType.includes('pct') || lowerType.includes('wipo')) {
        normalizedType = 'International (PCT)';
      } else if (lowerType.includes('uspto') || lowerType.includes('usa') || lowerType.includes('us')) {
        normalizedType = 'USPTO (USA)';
      } else if (lowerType.includes('epo') || lowerType.includes('europe')) {
        normalizedType = 'EPO (Europe)';
      } else if (lowerType.includes('international') || lowerType.includes('foreign')) {
        normalizedType = 'Other International';
      } else {
        normalizedType = 'National (Indian)';
      }

      const inventorsStr = Array.isArray(rawInventors) ? rawInventors.join(', ') : String(rawInventors);

      validRecords.push({
        title: String(title).trim(),
        inventors: inventorsStr.trim(),
        applicationNo: applicationNo ? String(applicationNo).trim() : null,
        patentNo: patentNo ? String(patentNo).trim() : null,
        status: normalizedStatus,
        patentType: normalizedType,
        department: String(department).trim(),
        grantYear: yearValidation.grantYear,
        academicYear: yearValidation.academicYear,
        filedDate: sanitizeDate(filedDate),
        publishedDate: sanitizeDate(publishedDate),
        grantedDate: sanitizeDate(grantedDate),
        licenseDate: sanitizeDate(licenseDate),
        partner: partner ? String(partner).trim() : null,
        revenue: sanitizeAmount(revenue),
        patentUrl: patentUrl ? String(patentUrl).trim() : null,
        description: description ? String(description).trim() : null,
        approvalStatus: req.user?.role === 'admin' ? 'approved' : 'submitted',
        createdBy: creatorId
      });

      recordProofLinks.push(validProofUrlsForRow);
    });

    if (validRecords.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: errors.length > 0 ? errors[0] : 'No valid patent records found to insert.',
        errors
      });
    }

    const createdPatents = await Patent.bulkCreate(validRecords, {
      transaction: t,
      returning: true
    });

    // Create Proof records for each patent that had Google Drive links
    const proofRecordsToCreate = [];
    createdPatents.forEach((patent, idx) => {
      const proofsForRow = recordProofLinks[idx] || [];
      proofsForRow.forEach(p => {
        proofRecordsToCreate.push({
          patentId: patent.id,
          sourceType: 'drive_link',
          driveFileId: p.fileId,
          driveUrl: p.url,
          fileName: `Google Drive Document (${p.fileId.slice(0, 8)})`,
          uploadedBy: creatorId,
          accessStatus: 'pending_verification',
          isActive: true
        });
      });
    });

    if (proofRecordsToCreate.length > 0) {
      await PatentProof.bulkCreate(proofRecordsToCreate, {
        transaction: t
      });
    }

    await t.commit();

    await logActionSafe({
      user: req.user,
      action: 'BULK_UPLOAD_PATENTS',
      previousValue: null,
      updatedValue: {
        count: createdPatents.length,
        proofLinksCount: proofRecordsToCreate.length,
        errorsCount: errors.length
      },
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Bulk uploaded ${createdPatents.length} patents with ${proofRecordsToCreate.length} proof links`
    });

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${createdPatents.length} patent records (${proofRecordsToCreate.length} Proof links attached).`,
      count: createdPatents.length,
      proofCount: proofRecordsToCreate.length,
      errors: errors.length > 0 ? errors : undefined,
      data: createdPatents
    });
  } catch (error) {
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (rbErr) {
        // ignore rollback errors if already committed
      }
    }
    console.error('Bulk upload patents error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to process bulk upload for patents: ${error.message}`,
      error: error.message
    });
  }
};

// @desc    Upload Proof files for a patent (Google Drive with automatic local server storage fallback)
// @route   POST /api/patents/:id/proofs
// @access  Private
exports.uploadPatentProof = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id);
    if (!patent) {
      return res.status(404).json({ success: false, message: 'Patent not found' });
    }

    const access = checkPatentAccess(patent, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No proof files provided for upload.' });
    }

    // Check maximum active attachments limit (10 per patent)
    const existingCount = await PatentProof.count({
      where: { patentId: patent.id, isActive: true }
    });

    if (existingCount + files.length > 10) {
      return res.status(400).json({
        success: false,
        message: `Attachment limit exceeded: Maximum 10 active proof attachments allowed per patent. Current: ${existingCount}, Attempted: ${files.length}.`
      });
    }

    const uploaded = [];
    const failed = [];

    for (const file of files) {
      let createdProof = null;

      // 1. Attempt Google Drive upload first (works seamlessly on Google Workspace Shared Drives)
      if (googleDriveService.isDriveConfigured()) {
        try {
          const driveResult = await googleDriveService.uploadPatentProofFile({
            patentId: patent.id,
            department: patent.department,
            year: patent.grantYear,
            fileBuffer: file.buffer,
            fileName: file.originalname,
            mimeType: file.mimetype
          });

          createdProof = await PatentProof.create({
            patentId: patent.id,
            sourceType: 'drive_upload',
            driveFileId: driveResult.driveFileId,
            driveFolderId: driveResult.driveFolderId,
            driveUrl: driveResult.driveUrl,
            fileName: driveResult.fileName,
            mimeType: driveResult.mimeType,
            fileSize: driveResult.fileSize,
            uploadedBy: req.user.id,
            accessStatus: 'verified',
            accessRemarks: 'Uploaded to institutional Google Drive',
            isActive: true
          });
        } catch (driveErr) {
          console.warn(`[PatentController] Google Drive upload attempt note for ${file.originalname}: ${driveErr.message}`);
          console.warn(`[PatentController] Notice: Falling back to platform server storage so user upload succeeds without interruption...`);
        }
      }

      // 2. Graceful fallback: If Google Drive is not configured or fails due to personal account 0MB quota limitation, store locally
      if (!createdProof) {
        try {
          const proofId = crypto.randomUUID();
          const ext = path.extname(file.originalname);
          const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
          const diskFileName = `${proofId}_${safeBase}${ext}`;

          const yearFolder = String(patent.grantYear || 'pending');
          const deptFolder = (patent.department || 'general').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
          const uploadsDir = path.resolve(__dirname, '../uploads/patents', yearFolder, deptFolder);
          fs.mkdirSync(uploadsDir, { recursive: true });

          const targetFilePath = path.join(uploadsDir, diskFileName);
          fs.writeFileSync(targetFilePath, file.buffer);

          const host = req.get('host') || 'localhost:5000';
          const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
          const fileUrl = `${protocol}://${host}/api/patents/proofs/file/${proofId}`;

          createdProof = await PatentProof.create({
            id: proofId,
            patentId: patent.id,
            sourceType: 'local_upload',
            driveFileId: targetFilePath,
            driveFolderId: null,
            driveUrl: fileUrl,
            fileName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size || file.buffer.length,
            uploadedBy: req.user.id,
            accessStatus: 'verified',
            accessRemarks: 'Stored securely on platform server storage',
            isActive: true
          });

          console.log(`[PatentController] Successfully saved proof file to platform storage: ${targetFilePath} (Proof ID: ${proofId})`);
        } catch (localErr) {
          console.error(`[PatentController ERROR] Server storage fallback failed for ${file.originalname}:`, localErr.message);
          failed.push({
            fileName: file.originalname,
            error: localErr.message
          });
        }
      }

      if (createdProof) {
        uploaded.push(createdProof);
      }
    }

    if (uploaded.length > 0) {
      await logActionSafe({
        recordId: patent.id,
        title: patent.title,
        user: req.user,
        action: 'ADD_PATENT_PROOF',
        previousValue: null,
        updatedValue: { uploadedCount: uploaded.length, failedCount: failed.length },
        ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
        remarks: `Uploaded ${uploaded.length} proof document(s) for patent: ${patent.title}`
      });
    }

    console.log(`[PatentController] Completed upload processing: ${uploaded.length} succeeded, ${failed.length} failed.`);

    res.status(uploaded.length > 0 ? 201 : 400).json({
      success: uploaded.length > 0,
      message: uploaded.length > 0
        ? `Successfully uploaded ${uploaded.length} of ${files.length} proof document(s).`
        : `Failed to upload proof document(s). Check server logs for details.`,
      uploaded,
      failed
    });
  } catch (error) {
    console.error('Upload proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process proof upload',
      error: error.message
    });
  }
};

// @desc    Add external Google Drive Proof links to a patent (Method B)
// @route   POST /api/patents/:id/proof-links
// @access  Private
exports.addPatentProofLinks = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id);
    if (!patent) {
      return res.status(404).json({ success: false, message: 'Patent not found' });
    }

    const access = checkPatentAccess(patent, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const { links } = req.body;
    if (!links) {
      return res.status(400).json({ success: false, message: 'No Google Drive links provided.' });
    }

    const linkList = Array.isArray(links)
      ? links
      : String(links).split('\n');

    const cleanLinks = linkList.map(l => l.trim()).filter(Boolean);
    if (cleanLinks.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one valid Google Drive link.' });
    }

    // Check maximum active attachments limit
    const existingCount = await PatentProof.count({
      where: { patentId: patent.id, isActive: true }
    });

    if (existingCount + cleanLinks.length > 10) {
      return res.status(400).json({
        success: false,
        message: `Attachment limit exceeded: Maximum 10 active proof attachments allowed per patent. Current: ${existingCount}, Attempted: ${cleanLinks.length}.`
      });
    }

    const createdProofs = [];
    const invalidLinks = [];

    for (const url of cleanLinks) {
      const validation = googleDriveService.validateDriveUrl(url);
      if (!validation.valid) {
        invalidLinks.push({ url, error: validation.error });
        continue;
      }

      // Check if this fileId / URL is already attached to this patent
      const duplicate = await PatentProof.findOne({
        where: {
          patentId: patent.id,
          driveUrl: validation.sanitizedUrl,
          isActive: true
        }
      });

      if (duplicate) {
        invalidLinks.push({ url, error: 'Document link already attached to this patent' });
        continue;
      }

      const verification = await googleDriveService.verifyDriveLinkAccess(validation.sanitizedUrl);

      const record = await PatentProof.create({
        patentId: patent.id,
        sourceType: 'drive_link',
        driveFileId: validation.fileId,
        driveUrl: validation.sanitizedUrl,
        fileName: verification.fileName || `Google Drive Document (${validation.fileId.slice(0, 8)})`,
        mimeType: verification.mimeType || 'application/vnd.google-apps.document',
        fileSize: verification.fileSize || null,
        uploadedBy: req.user.id,
        accessStatus: verification.status,
        accessRemarks: verification.remarks,
        isActive: true
      });

      createdProofs.push(record);
    }

    if (createdProofs.length > 0) {
      await logActionSafe({
        recordId: patent.id,
        title: patent.title,
        user: req.user,
        action: 'ADD_PATENT_PROOF_LINK',
        previousValue: null,
        updatedValue: { createdCount: createdProofs.length, invalidCount: invalidLinks.length },
        ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
        remarks: `Attached ${createdProofs.length} Google Drive link(s) for patent: ${patent.title}`
      });
    }

    res.status(201).json({
      success: createdProofs.length > 0,
      message: `Successfully attached ${createdProofs.length} Google Drive link(s).`,
      proofs: createdProofs,
      invalidLinks: invalidLinks.length > 0 ? invalidLinks : undefined
    });
  } catch (error) {
    console.error('Add proof links error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add proof links',
      error: error.message
    });
  }
};

// @desc    Get active Proofs for a specific patent
// @route   GET /api/patents/:id/proofs
// @access  Private
exports.getPatentProofs = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id);
    if (!patent) {
      return res.status(404).json({ success: false, message: 'Patent not found' });
    }

    const access = checkPatentAccess(patent, req.user, 'view');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const proofs = await PatentProof.findAll({
      where: { patentId: patent.id, isActive: true },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: proofs
    });
  } catch (error) {
    console.error('Get patent proofs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve patent proofs',
      error: error.message
    });
  }
};

// @desc    Remove a Proof reference from a patent
// @route   DELETE /api/patents/:id/proofs/:proofId
// @access  Private
exports.deletePatentProof = async (req, res) => {
  try {
    const { id: patentId, proofId } = req.params;

    const patent = await Patent.findByPk(patentId);
    if (!patent) {
      return res.status(404).json({ success: false, message: 'Patent not found' });
    }

    const access = checkPatentAccess(patent, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const proof = await PatentProof.findOne({
      where: { id: proofId, patentId: patent.id, isActive: true }
    });

    if (!proof) {
      return res.status(404).json({ success: false, message: 'Proof attachment not found' });
    }

    // If local file, delete from disk; if managed file in Drive, delete from Drive
    if (proof.sourceType === 'local_upload' && proof.driveFileId) {
      try {
        if (fs.existsSync(proof.driveFileId)) {
          fs.unlinkSync(proof.driveFileId);
          console.log(`[PatentController] Deleted local proof file: ${proof.driveFileId}`);
        }
      } catch (fsErr) {
        console.warn('[PatentController] Could not unlink local file (non-fatal):', fsErr.message);
      }
    } else if (proof.sourceType === 'drive_upload' && proof.driveFileId) {
      googleDriveService.deletePatentProofFile(proof.driveFileId).catch(() => {});
    }

    await proof.destroy();

    await logActionSafe({
      recordId: proof.id,
      title: proof.fileName || 'Patent Proof',
      user: req.user,
      action: 'REMOVE_PATENT_PROOF',
      previousValue: proof.toJSON(),
      updatedValue: null,
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Removed proof document from patent: ${patent.title}`
    });

    res.json({
      success: true,
      message: 'Proof document removed successfully'
    });
  } catch (error) {
    console.error('Delete patent proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete proof document',
      error: error.message
    });
  }
};

// @desc    Stream / view a locally stored patent proof file
// @route   GET /api/patents/proofs/file/:proofId
// @access  Public / Direct Link with secure proof UUID
exports.getPatentProofFile = async (req, res) => {
  try {
    const proof = await PatentProof.findByPk(req.params.proofId);
    if (!proof || !proof.isActive) {
      return res.status(404).json({ success: false, message: 'Proof document not found or inactive.' });
    }

    // If external Google Drive link, redirect to Google Drive
    if (proof.sourceType === 'drive_link' || (proof.sourceType === 'drive_upload' && proof.driveUrl && proof.driveUrl.includes('drive.google.com'))) {
      return res.redirect(proof.driveUrl);
    }

    const filePath = proof.driveFileId;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Local proof file could not be found on server storage.' });
    }

    res.setHeader('Content-Type', proof.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(proof.fileName)}"`);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (streamErr) => {
      console.error('File stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error streaming file.' });
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error('Get proof file error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving file.', error: error.message });
  }
};

// @desc    Clear all patents (Admin / HOD / Coordinator)
// @route   DELETE /api/patents/clear-all
// @access  Private (Admin / HOD)
exports.clearAllPatents = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'Patent', true);

    let count = 0;
    await sequelize.transaction(async (t) => {
      count = await Patent.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_PATENTS',
      title: `Cleared patents: ${scopeDescription}`,
      remarks: `Deleted ${count} patent records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Cleared ${count} patent records successfully for ${scopeDescription}.`
    });
  } catch (error) {
    console.error('Clear patents error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to clear patents'
    });
  }
};

// Export validation helper for unit testing
exports.validateYearAndStatus = validateYearAndStatus;
