'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Placement, User, Student } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { logActionSafe } = require('../middleware/auditLogger');
const { parsePagination, formatPaginationResponse } = require('../utils/paginationHelper');
const googleDriveService = require('../services/googleDriveService');

// Allowed fields for regular placement updates
const ALLOWED_PLACEMENT_FIELDS = [
  'studentId', 'studentName', 'batch', 'course', 'company', 'role',
  'package', 'placementType', 'placementDate', 'location',
  'campus', 'school', 'offerLetterUrl', 'offerLetterFileName', 'offerLetterDriveId'
];

/**
 * Normalizes text string conservatively.
 */
function normalizeString(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/**
 * Normalizes register number as text, preserving leading zeros and whitespace.
 */
function normalizeRegisterNumber(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/**
 * Normalizes string for case-insensitive and whitespace-collapsed comparisons.
 */
function normalizeCompKey(str) {
  return String(str || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Parses and validates package / stipend based on placement type.
 * - Placement: package is mandatory annual salary in LPA (e.g. 8.5)
 * - Internship: package is optional monthly stipend in INR (e.g. 15000)
 *   - blank / empty / undefined => null (Not Provided)
 *   - explicit 0 => 0 (Unpaid Internship)
 */
function parseCompensation(rawVal, placementType) {
  const isInternship = placementType === 'internship';

  if (
    rawVal === undefined ||
    rawVal === null ||
    String(rawVal).trim() === '' ||
    String(rawVal).trim() === '-' ||
    String(rawVal).trim().toLowerCase() === 'n/a' ||
    String(rawVal).trim().toLowerCase() === 'nil' ||
    String(rawVal).trim().toLowerCase() === 'none'
  ) {
    if (isInternship) {
      return { valid: true, value: null, formatted: 'Not Provided', isNull: true };
    } else {
      return { valid: false, error: 'Package (LPA) is mandatory for Placement records.' };
    }
  }

  const strVal = String(rawVal).trim();
  if (strVal === '0' || strVal === '0.0' || strVal === '0.00') {
    return {
      valid: true,
      value: 0,
      formatted: isInternship ? '₹0 (Unpaid)' : '₹ 0 LPA',
      isZero: true
    };
  }

  // Strip currency symbols, commas, or "lpa" / "inr" / "/mo" suffixes
  const cleaned = strVal.replace(/[₹$,/a-zA-Z\s]/g, '');
  const num = parseFloat(cleaned);

  if (isNaN(num) || !isFinite(num) || num < 0) {
    return { valid: false, error: `Invalid compensation value "${rawVal}". Must be a valid non-negative number.` };
  }

  if (isInternship) {
    // Monthly stipend in INR (no division by 100000!)
    return {
      valid: true,
      value: num,
      formatted: `₹ ${Number(num).toLocaleString('en-IN')} /mo`
    };
  } else {
    // Annual salary in LPA
    return {
      valid: true,
      value: num,
      formatted: `₹ ${num} LPA`
    };
  }
}

/**
 * Core verification engine for Placements & Internships Bulk Upload V2.1.
 * 
 * Validates:
 * 1. 7 approved columns
 * 2. Student Details identity verification (Student model lookup by registerNumber)
 * 3. Exact duplicate detection (both intra-batch and database)
 * 4. Permission & department scope check
 * 5. Compensation semantics (LPA vs monthly stipend)
 */
async function verifyPlacementBatch(records, options = {}) {
  const { academicYear, placementType, campus, school, user } = options;
  if (!Array.isArray(records)) {
    return { summary: { total: 0, ready: 0, needsReview: 0, invalid: 0, duplicates: 0 }, records: [] };
  }

  const targetAY = academicYear || '2024-2025';
  const targetType = placementType === 'internship' ? 'internship' : 'placement';
  const userDept = user && user.role !== 'admin' && user.role !== 'authority' ? user.department : null;

  // Extract all register numbers to query Student database in bulk
  const regNoSet = new Set();
  records.forEach(r => {
    const regNo = normalizeRegisterNumber(
      r['Register Number'] || r.studentId || r['Register No'] || r['RegisterNo'] || r['regNo']
    );
    if (regNo) regNoSet.add(regNo);
  });

  const uniqueRegNos = Array.from(regNoSet);

  // 1. Query existing Student Details
  const studentMap = {};
  if (options.mockStudents && Array.isArray(options.mockStudents)) {
    options.mockStudents.forEach(st => {
      studentMap[normalizeCompKey(st.registerNumber)] = st;
    });
  } else if (uniqueRegNos.length > 0) {
    try {
      const existingStudents = await Student.findAll({
        where: {
          registerNumber: { [Op.in]: uniqueRegNos }
        },
        attributes: ['id', 'registerNumber', 'name', 'department', 'course', 'campus', 'school']
      });

      existingStudents.forEach(st => {
        studentMap[normalizeCompKey(st.registerNumber)] = st;
      });
    } catch (dbErr) {
      console.warn('[PlacementController] Student lookup notice:', dbErr.message);
    }
  }

  // 2. Query existing Placements for duplicate offer detection
  const dbOfferKeys = new Set();
  const mockPlacements = options.mockPlacements || (options.mockStudents ? [] : null);
  if (Array.isArray(mockPlacements)) {
    mockPlacements.forEach(p => {
      const pkgStr = p.package !== null && p.package !== undefined ? String(Number(p.package)) : 'null';
      const key = `${normalizeCompKey(p.studentId)}::${normalizeCompKey(p.company)}::${normalizeCompKey(p.role)}::${pkgStr}`;
      dbOfferKeys.add(key);
    });
  } else if (uniqueRegNos.length > 0) {
    try {
      const existingPlacements = await Placement.findAll({
        where: {
          studentId: { [Op.in]: uniqueRegNos },
          batch: targetAY,
          placementType: targetType
        },
        attributes: ['id', 'studentId', 'company', 'role', 'package', 'batch', 'placementType']
      });

      existingPlacements.forEach(p => {
        const pkgStr = p.package !== null && p.package !== undefined ? String(Number(p.package)) : 'null';
        const key = `${normalizeCompKey(p.studentId)}::${normalizeCompKey(p.company)}::${normalizeCompKey(p.role)}::${pkgStr}`;
        dbOfferKeys.add(key);
      });
    } catch (dbErr) {
      console.warn('[PlacementController] Existing placement lookup notice:', dbErr.message);
    }
  }

  const batchOfferKeys = new Set();
  const verifiedRecords = [];
  let readyCount = 0;
  let reviewCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  let withOfferLettersCount = 0;

  for (let idx = 0; idx < records.length; idx++) {
    const r = records[idx];
    const issues = [];
    let rowStatus = 'ready';

    // Extract exactly seven standardized fields
    const studentId = normalizeRegisterNumber(
      r['Register Number'] || r.studentId || r['Register No'] || r['RegisterNo'] || r['regNo']
    );
    const studentName = normalizeString(r['Name'] || r.studentName || r['Student Name']);
    const department = normalizeString(r['Department'] || r.department);
    const course = normalizeString(r['Program'] || r.course || r['Course'] || r['Degree']);
    const role = normalizeString(r['Designation/Role'] || r.role || r['Role'] || r['Designation']);
    const company = normalizeString(r['Company'] || r.company);
    const rawPackage = r['Package'] !== undefined ? r['Package'] : r.package;
    const tempId = r._tempId || r.tempId || `offer-${idx + 1}-${studentId || 'unassigned'}-${Date.now()}`;
    const offerLetterUrl = r.offerLetterUrl || null;
    const offerLetterFileName = r.offerLetterFileName || null;

    if (offerLetterUrl || r.offerLetterFile) {
      withOfferLettersCount++;
    }

    // Validate mandatory required fields
    if (!studentId) {
      issues.push('Missing mandatory field: Register Number.');
      rowStatus = 'invalid';
    }
    if (!studentName) {
      issues.push('Missing mandatory field: Student Name.');
      rowStatus = 'invalid';
    }
    if (!department) {
      issues.push('Missing mandatory field: Department.');
      rowStatus = 'invalid';
    }

    // Student Details existence verification
    const studentRecord = studentId ? studentMap[normalizeCompKey(studentId)] : null;
    if (studentId && !studentRecord) {
      issues.push(`Register Number "${studentId}" does not exist in Student Details.`);
      rowStatus = 'invalid';
    }

    let resolvedCourse = course || (studentRecord && studentRecord.course ? studentRecord.course : '');
    if (!resolvedCourse) {
      issues.push('Missing mandatory field: Program.');
      rowStatus = 'invalid';
    }
    if (!company) {
      issues.push('Missing mandatory field: Company.');
      rowStatus = 'invalid';
    }

    // Compensation validation
    const compResult = parseCompensation(rawPackage, targetType);
    if (!compResult.valid) {
      issues.push(compResult.error);
      rowStatus = 'invalid';
    }

    if (studentRecord) {
      // Identity matching verification
      const normRegDept = normalizeCompKey(department);
      const normStudentDept = normalizeCompKey(studentRecord.department);
      if (normRegDept && normStudentDept && normRegDept !== normStudentDept && !normStudentDept.includes(normRegDept) && !normRegDept.includes(normStudentDept)) {
        issues.push(`Department "${department}" differs from Student Details profile ("${studentRecord.department}").`);
        if (rowStatus === 'ready') rowStatus = 'needs_review';
      }

      const normRegName = normalizeCompKey(studentName);
      const normStudentName = normalizeCompKey(studentRecord.name);
      if (normRegName && normStudentName && normRegName !== normStudentName && !normStudentName.includes(normRegName) && !normRegName.includes(normStudentName)) {
        issues.push(`Student name "${studentName}" differs from Student Details profile ("${studentRecord.name}").`);
        if (rowStatus === 'ready') rowStatus = 'needs_review';
      }
    }

    // Authorization & department scope check
    if (userDept && department) {
      const normUserDept = normalizeCompKey(userDept);
      const normRecordDept = normalizeCompKey(department);
      if (normRecordDept !== normUserDept && !normRecordDept.includes(normUserDept)) {
        issues.push(`Access denied: You are not authorized to upload placement records for department "${department}".`);
        rowStatus = 'invalid';
      }
    }

    // Duplicate offer detection
    const pkgStr = compResult.valid && compResult.value !== null ? String(Number(compResult.value)) : 'null';
    const offerKey = `${normalizeCompKey(studentId)}::${normalizeCompKey(company)}::${normalizeCompKey(role)}::${pkgStr}`;

    if (rowStatus !== 'invalid') {
      if (batchOfferKeys.has(offerKey)) {
        issues.push(`Exact duplicate offer detected within this uploaded file for student "${studentId}" at "${company}".`);
        rowStatus = 'duplicate';
      } else if (dbOfferKeys.has(offerKey)) {
        issues.push(`Identical offer already recorded in the database for student "${studentId}" at "${company}" in ${targetAY}.`);
        rowStatus = 'duplicate';
      } else {
        batchOfferKeys.add(offerKey);
      }
    }

    if (rowStatus === 'ready') readyCount++;
    else if (rowStatus === 'needs_review') reviewCount++;
    else if (rowStatus === 'duplicate') duplicateCount++;
    else if (rowStatus === 'invalid') invalidCount++;

    verifiedRecords.push({
      _tempId: tempId,
      _rowStatus: rowStatus,
      _issues: issues,
      studentId,
      studentName,
      department,
      course: resolvedCourse || course || null,
      role: role || null,
      company,
      package: compResult.valid ? compResult.value : null,
      packageFormatted: compResult.valid ? compResult.formatted : String(rawPackage || 'Invalid'),
      placementType: targetType,
      batch: targetAY,
      campus: campus || (studentRecord ? studentRecord.campus : null),
      school: school || (studentRecord ? studentRecord.school : null),
      offerLetterUrl,
      offerLetterFileName,
      matchedStudent: studentRecord ? {
        id: studentRecord.id,
        name: studentRecord.name,
        department: studentRecord.department,
        course: studentRecord.course
      } : null
    });
  }

  return {
    summary: {
      total: records.length,
      ready: readyCount,
      needsReview: reviewCount,
      invalid: invalidCount,
      duplicates: duplicateCount,
      withOfferLetters: withOfferLettersCount,
      withoutOfferLetters: records.length - withOfferLettersCount,
      academicYear: targetAY,
      placementType: targetType,
      campus: campus || 'All',
      school: school || 'All'
    },
    records: verifiedRecords
  };
}

// @desc    Get all placements
// @route   GET /api/placements
// @access  Private
exports.getPlacements = async (req, res) => {
  try {
    const { batch, placementType, company, academicYear } = req.query;
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Placement', false);
    
    const where = { ...scopeWhere };
    if ((req.user.role === 'admin' || req.user.role === 'authority') &&
        req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
      where.department = req.query.department;
    }
    const targetBatch = batch || academicYear;
    if (targetBatch && targetBatch !== 'all' && targetBatch !== 'All') where.batch = targetBatch;
    if (placementType && placementType !== 'all') where.placementType = placementType;
    if (company) where.company = { [Op.iLike]: `%${company}%` };

    const { page, limit, offset, isExport } = parsePagination(req.query);

    const { count, rows: placements } = await Placement.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }],
      order: [['placementDate', 'DESC'], ['id', 'ASC']],
      limit: isExport ? undefined : limit,
      offset: isExport ? undefined : offset,
      distinct: true
    });

    res.json(formatPaginationResponse({
      count,
      rows: placements,
      page,
      limit
    }));
  } catch (error) {
    console.error('Get placements error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get placement statistics
// @route   GET /api/placements/stats
// @access  Private
exports.getPlacementStats = async (req, res) => {
  try {
    const { batch, placementType } = req.query;
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Placement', false);
    const where = { ...scopeWhere };
    
    if (batch) where.batch = batch;
    if ((req.user.role === 'admin' || req.user.role === 'authority') &&
        req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
      where.department = req.query.department;
    }

    // Default package statistics to placements (LPA) to avoid mathematical conflation with monthly stipends
    if (placementType && placementType !== 'all') {
      where.placementType = placementType;
    } else {
      where.placementType = 'placement';
    }

    const stats = await Placement.findAll({
      where,
      attributes: [
        'department',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalPlacements'],
        [sequelize.fn('AVG', sequelize.col('package')), 'avgPackage'],
        [sequelize.fn('MAX', sequelize.col('package')), 'maxPackage'],
        [sequelize.fn('MIN', sequelize.col('package')), 'minPackage']
      ],
      group: ['department']
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get placement stats error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Create placement
// @route   POST /api/placements
// @access  Private
exports.createPlacement = async (req, res) => {
  try {
    const dept = req.user.role === 'admin' ? (req.body.department || 'General') : (req.user.department || 'General');
    const record = {};
    ALLOWED_PLACEMENT_FIELDS.forEach(f => {
      if (req.body[f] !== undefined) record[f] = req.body[f];
    });
    record.department = dept;
    record.createdBy = req.user.id;

    const placement = await Placement.create(record);

    res.status(201).json({
      success: true,
      data: placement
    });
  } catch (error) {
    console.error('Create placement error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update placement
// @route   PUT /api/placements/:id
// @access  Private
exports.updatePlacement = async (req, res) => {
  try {
    const placement = await Placement.findByPk(req.params.id);

    if (!placement) {
      return res.status(404).json({
        success: false,
        message: 'Placement not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && req.user.role !== 'hod') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update placements'
      });
    }

    if (req.user.role !== 'admin' && placement.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot update placements outside your department.'
      });
    }

    const updateData = {};
    ALLOWED_PLACEMENT_FIELDS.forEach(f => {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    });
    if (req.user.role === 'admin' && req.body.department !== undefined) {
      updateData.department = req.body.department;
    }

    delete updateData.id;
    delete updateData.createdBy;

    await placement.update(updateData);

    res.json({
      success: true,
      data: placement
    });
  } catch (error) {
    console.error('Update placement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete placement
// @route   DELETE /api/placements/:id
// @access  Private
exports.deletePlacement = async (req, res) => {
  try {
    const placement = await Placement.findByPk(req.params.id);

    if (!placement) {
      return res.status(404).json({
        success: false,
        message: 'Placement not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && req.user.role !== 'hod') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete placements'
      });
    }

    if (req.user.role !== 'admin' && placement.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot delete placements outside your department.'
      });
    }

    // If local offer letter exists, clean up
    if (placement.offerLetterDriveId && fs.existsSync(placement.offerLetterDriveId)) {
      try {
        fs.unlinkSync(placement.offerLetterDriveId);
      } catch (err) {
        console.warn('Could not remove offer letter on delete:', err.message);
      }
    }

    await placement.destroy();

    res.json({
      success: true,
      message: 'Placement deleted successfully'
    });
  } catch (error) {
    console.error('Delete placement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Verify bulk placements before import (Stage 2 Validation & Stage 3 Preview)
// @route   POST /api/placements/verify-bulk
// @access  Private (Admin, Coordinator, HOD)
exports.verifyBulkPlacements = async (req, res) => {
  try {
    const { placements, academicYear, placementType, campus, school } = req.body;

    if (!Array.isArray(placements)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid placements payload. "placements" must be an array.'
      });
    }

    const verified = await verifyPlacementBatch(placements, {
      academicYear,
      placementType,
      campus,
      school,
      user: req.user
    });

    res.json({
      success: true,
      summary: verified.summary,
      records: verified.records
    });
  } catch (error) {
    console.error('Verify bulk placements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify bulk placements: ' + error.message
    });
  }
};

// @desc    Bulk create placements (Stage 4 Confirm -> Stage 5 Summary)
// @route   POST /api/placements/bulk
// @access  Private (Admin, Coordinator, HOD)
exports.bulkCreatePlacements = async (req, res) => {
  try {
    const { placements, academicYear, placementType, campus, school } = req.body;

    if (!Array.isArray(placements) || placements.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid placements data. Must be a non-empty array.'
      });
    }

    // Independently verify on the backend (Never trust client validation alone!)
    const verified = await verifyPlacementBatch(placements, {
      academicYear,
      placementType,
      campus,
      school,
      user: req.user
    });

    // Only "ready" records are eligible for persistent database insertion
    const readyRecords = verified.records.filter(r => r._rowStatus === 'ready');

    if (readyRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bulk import failed. No eligible records passed verification.',
        summary: verified.summary,
        errors: verified.records.map(r => ({
          tempId: r._tempId,
          studentId: r.studentId,
          status: r._rowStatus,
          issues: r._issues
        }))
      });
    }

    let createdRecords = [];
    await sequelize.transaction(async (t) => {
      const recordsToInsert = readyRecords.map(r => ({
        studentName: r.studentName,
        studentId: r.studentId,
        department: r.department,
        course: r.course,
        role: r.role || null,
        company: r.company,
        package: r.package,
        placementType: r.placementType,
        batch: r.batch,
        campus: r.campus || null,
        school: r.school || null,
        offerLetterUrl: r.offerLetterUrl || null,
        offerLetterFileName: r.offerLetterFileName || null,
        placementDate: new Date().toISOString().split('T')[0],
        createdBy: req.user.id
      }));

      const created = await Placement.bulkCreate(recordsToInsert, {
        returning: true,
        transaction: t
      });

      // Map back tempId so client knows which placement ID belongs to which temporary row
      createdRecords = created.map((item, idx) => ({
        ...item.toJSON(),
        _tempId: readyRecords[idx]._tempId
      }));
    });

    await logActionSafe({
      user: req.user,
      action: 'BULK_IMPORT_PLACEMENTS',
      title: `Bulk imported ${createdRecords.length} ${placementType || 'placement'} records`,
      remarks: `Imported: ${createdRecords.length}, Skipped duplicates: ${verified.summary.duplicates}, Excluded invalid/review: ${verified.summary.invalid + verified.summary.needsReview}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: `Bulk import completed. Successfully imported ${createdRecords.length} records.`,
      count: createdRecords.length,
      summary: verified.summary,
      skippedDuplicates: verified.summary.duplicates,
      invalidExcluded: verified.summary.invalid,
      needsReviewExcluded: verified.summary.needsReview,
      data: createdRecords
    });
  } catch (error) {
    console.error('Bulk import placements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Upload / Replace offer letter for a placement record
// @route   POST /api/placements/:id/offer-letter
// @access  Private (Admin, Coordinator, HOD)
exports.uploadOfferLetter = async (req, res) => {
  try {
    const placement = await Placement.findByPk(req.params.id);
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement record not found.' });
    }

    // Permission check
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && req.user.role !== 'hod') {
      return res.status(403).json({ success: false, message: 'Not authorized to upload offer letters.' });
    }
    if (req.user.role !== 'admin' && placement.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Access denied: Cannot upload documents outside your department.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No offer letter file provided.' });
    }

    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png'];
    if (!allowedExts.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Only PDF, JPG, JPEG, and PNG files are allowed.'
      });
    }

    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/pjpeg'];
    if (!allowedMimes.includes(file.mimetype.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file MIME type.'
      });
    }

    let offerLetterUrl = null;
    let offerLetterDriveId = null;

    // 1. Attempt institutional Google Drive upload if configured
    if (googleDriveService.isDriveConfigured()) {
      try {
        const driveResult = await googleDriveService.uploadPlacementOfferLetterFile({
          placementId: placement.id,
          department: placement.department,
          batch: placement.batch,
          fileBuffer: file.buffer,
          fileName: file.originalname,
          mimeType: file.mimetype
        });
        offerLetterUrl = driveResult.driveUrl;
        offerLetterDriveId = driveResult.driveFileId;
      } catch (driveErr) {
        console.warn('[PlacementController] Google Drive upload notice:', driveErr.message);
      }
    }

    // 2. Fallback to platform local storage
    if (!offerLetterUrl) {
      const docId = crypto.randomUUID();
      const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      const diskFileName = `${docId}_${safeBase}${ext}`;
      const uploadsDir = path.resolve(__dirname, '../uploads/placements/offer_letters');
      fs.mkdirSync(uploadsDir, { recursive: true });

      const targetFilePath = path.join(uploadsDir, diskFileName);
      fs.writeFileSync(targetFilePath, file.buffer);

      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      offerLetterUrl = `${protocol}://${host}/api/placements/${placement.id}/offer-letter/file`;
      offerLetterDriveId = targetFilePath;
    }

    await placement.update({
      offerLetterUrl,
      offerLetterFileName: file.originalname,
      offerLetterDriveId
    });

    await logActionSafe({
      user: req.user,
      action: 'UPLOAD_OFFER_LETTER',
      title: `Uploaded offer letter for ${placement.studentName}`,
      remarks: `Uploaded ${file.originalname} for offer at ${placement.company}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Offer letter uploaded successfully',
      data: {
        id: placement.id,
        offerLetterUrl: placement.offerLetterUrl,
        offerLetterFileName: placement.offerLetterFileName
      }
    });
  } catch (error) {
    console.error('Upload offer letter error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload offer letter: ' + error.message });
  }
};

// @desc    Delete offer letter from a placement record
// @route   DELETE /api/placements/:id/offer-letter
// @access  Private (Admin, Coordinator, HOD)
exports.deleteOfferLetter = async (req, res) => {
  try {
    const placement = await Placement.findByPk(req.params.id);
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement record not found.' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && req.user.role !== 'hod') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete offer letters.' });
    }
    if (req.user.role !== 'admin' && placement.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Access denied: Cannot delete documents outside your department.' });
    }

    // If local file on disk, clean up
    if (placement.offerLetterDriveId && fs.existsSync(placement.offerLetterDriveId)) {
      try {
        fs.unlinkSync(placement.offerLetterDriveId);
      } catch (unlinkErr) {
        console.warn('Could not remove local offer letter file:', unlinkErr.message);
      }
    }

    await placement.update({
      offerLetterUrl: null,
      offerLetterFileName: null,
      offerLetterDriveId: null
    });

    res.json({
      success: true,
      message: 'Offer letter removed successfully'
    });
  } catch (error) {
    console.error('Delete offer letter error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove offer letter.' });
  }
};

// @desc    Serve / Download local offer letter document
// @route   GET /api/placements/:id/offer-letter/file
// @access  Private / Authorized Link
exports.getOfferLetterFile = async (req, res) => {
  try {
    const placement = await Placement.findByPk(req.params.id);
    if (!placement || !placement.offerLetterUrl) {
      return res.status(404).json({ success: false, message: 'Offer letter document not found.' });
    }

    // If external Google Drive link, redirect to Drive
    if (placement.offerLetterUrl.includes('drive.google.com')) {
      return res.redirect(placement.offerLetterUrl);
    }

    const filePath = placement.offerLetterDriveId;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Offer letter file not found on server storage.' });
    }

    const ext = path.extname(placement.offerLetterFileName || filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(placement.offerLetterFileName || 'offer_letter' + ext)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Get offer letter file error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve offer letter file.' });
  }
};

// @desc    Clear all placement records
// @route   DELETE /api/placements/clear-all
// @access  Private (Admin/Coordinator/HOD)
exports.clearAllPlacements = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'Placement', true);

    let deletedCount = 0;
    await sequelize.transaction(async (t) => {
      deletedCount = await Placement.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_PLACEMENTS',
      title: `Cleared placement records: ${scopeDescription}`,
      remarks: `Deleted ${deletedCount} placement records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Placement records (${deletedCount}) cleared successfully for ${scopeDescription}`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Clear all placements error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Export helper for unit testing
exports.verifyPlacementBatch = verifyPlacementBatch;
exports.parseCompensation = parseCompensation;
