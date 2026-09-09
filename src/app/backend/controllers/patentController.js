const { Patent, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../middleware/auditLogger');
const { sendNotification } = require('../middleware/notificationHelper');

let schemaMigrationDone = false;
const ensurePatentTableSchema = async () => {
  if (schemaMigrationDone) return;
  try {
    await sequelize.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE "patents" ALTER COLUMN "status" TYPE VARCHAR(100) USING "status"::text;
          ALTER TABLE "patents" ALTER COLUMN "patentType" TYPE VARCHAR(100) USING "patentType"::text;
          ALTER TABLE "patents" ALTER COLUMN "academicYear" TYPE VARCHAR(50) USING "academicYear"::text;
          ALTER TABLE "patents" ALTER COLUMN "department" TYPE VARCHAR(255) USING "department"::text;
          ALTER TABLE "patents" ALTER COLUMN "approvalStatus" TYPE VARCHAR(50) USING "approvalStatus"::text;
          ALTER TABLE "patents" ALTER COLUMN "inventors" TYPE TEXT;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;

        BEGIN
          ALTER TABLE "patents" ALTER COLUMN "status" DROP NOT NULL;
          ALTER TABLE "patents" ALTER COLUMN "patentType" DROP NOT NULL;
          ALTER TABLE "patents" ALTER COLUMN "academicYear" DROP NOT NULL;
          ALTER TABLE "patents" ALTER COLUMN "department" DROP NOT NULL;
          ALTER TABLE "patents" ALTER COLUMN "createdBy" DROP NOT NULL;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;

        BEGIN
          DROP TYPE IF EXISTS "enum_patents_status" CASCADE;
          DROP TYPE IF EXISTS "enum_patents_patentType" CASCADE;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END $$;
    `);
    schemaMigrationDone = true;
  } catch (err) {
    console.warn('Patent schema migration error (ignoring):', err.message);
  }
};

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

// @desc    Get all patents with filtering, searching, and role isolation
// @route   GET /api/patents
// @access  Private / Public (optional)
exports.getPatents = async (req, res) => {
  await ensurePatentTableSchema();
  try {
    const {
      status,
      patentType,
      academicYear,
      year,
      department,
      search
    } = req.query;

    const where = {};
    const selectedYear = academicYear || year;

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
      where.academicYear = selectedYear;
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

    const patents = await Patent.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }],
      order: [
        ['academicYear', 'DESC'],
        ['filedDate', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json({
      success: true,
      count: patents.length,
      data: patents
    });
  } catch (error) {
    console.error('Get patents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve patent records',
      error: error.message
    });
  }
};

// @desc    Get aggregate patent statistics
// @route   GET /api/patents/stats
// @access  Private / Public
exports.getPatentStats = async (req, res) => {
  try {
    const { year, department } = req.query;
    const where = {};

    if (year && year !== 'all') where.academicYear = year;
    if (department && department !== 'all') {
      where.department = { [Op.iLike]: `%${department}%` };
    }

    const allPatents = await Patent.findAll({ where });

    let filedCount = 0;
    let publishedCount = 0;
    let grantedCount = 0;
    let commercializedCount = 0;
    let totalRevenue = 0;
    let nationalCount = 0;
    let internationalCount = 0;

    const departmentBreakdown = {};
    const yearBreakdown = {};

    allPatents.forEach(p => {
      const s = (p.status || '').toLowerCase();
      if (s.includes('commercial')) {
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

      const y = p.academicYear || 'Unknown';
      yearBreakdown[y] = (yearBreakdown[y] || 0) + 1;
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

// @desc    Get single patent by ID
// @route   GET /api/patents/:id
// @access  Private
exports.getPatent = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    if (!patent) {
      return res.status(404).json({
        success: false,
        message: 'Patent record not found'
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

// @desc    Create new patent record
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
      academicYear,
      filedDate,
      publishedDate,
      grantedDate,
      licenseDate,
      partner,
      revenue,
      patentUrl,
      description,
      approvalStatus
    } = req.body;

    // Validation for required fields
    const missing = [];
    if (!title || !String(title).trim()) missing.push('Patent Title');
    if (!inventors || (Array.isArray(inventors) ? inventors.length === 0 : !String(inventors).trim())) missing.push('Inventor Name(s)');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Missing required field(s): ${missing.join(', ')}. Please provide all required information before submitting.`,
        missingFields: missing
      });
    }

    const rawInventors = Array.isArray(inventors) ? inventors.join(', ') : String(inventors);
    const assignedDept = department || req.user.department || 'General';
    const assignedYear = academicYear || '2024-2025';

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
      academicYear: assignedYear.trim(),
      filedDate: sanitizeDate(filedDate),
      publishedDate: sanitizeDate(publishedDate),
      grantedDate: sanitizeDate(grantedDate),
      licenseDate: sanitizeDate(licenseDate),
      partner: partner ? partner.trim() : null,
      revenue: sanitizeAmount(revenue),
      patentUrl: patentUrl ? patentUrl.trim() : null,
      description: description ? description.trim() : null,
      approvalStatus: approvalStatus || (req.user?.role === 'admin' ? 'approved' : 'submitted'),
      createdBy: creatorId
    });

    try {
      if (creatorId) {
        await logAction(
          creatorId,
          'CREATE_PATENT',
          'Patent',
          patent.id,
          null,
          patent.toJSON(),
          req
        );
      }
    } catch (auditErr) {
      console.warn('Audit logging failed for create patent (ignoring):', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Patent record created successfully',
      data: patent
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

// @desc    Update patent record
// @route   PUT /api/patents/:id
// @access  Private
exports.updatePatent = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id);

    if (!patent) {
      return res.status(404).json({
        success: false,
        message: 'Patent not found'
      });
    }

    if (req.user.role === 'faculty' && patent.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit patents created by you.'
      });
    }

    const oldValues = patent.toJSON();

    const allowedFields = [
      'title', 'inventors', 'applicationNo', 'patentNo', 'status', 'patentType',
      'department', 'academicYear', 'filedDate', 'publishedDate', 'grantedDate',
      'licenseDate', 'partner', 'revenue', 'patentUrl', 'description', 'approvalStatus'
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

    await patent.save();

    await logAction(
      req.user.id,
      'UPDATE_PATENT',
      'Patent',
      patent.id,
      oldValues,
      patent.toJSON(),
      req
    );

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

// @desc    Delete patent
// @route   DELETE /api/patents/:id
// @access  Private
exports.deletePatent = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id);

    if (!patent) {
      return res.status(404).json({
        success: false,
        message: 'Patent not found'
      });
    }

    if (req.user.role === 'faculty' && patent.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete patents created by you.'
      });
    }

    const oldValues = patent.toJSON();
    await patent.destroy();

    await logAction(
      req.user.id,
      'DELETE_PATENT',
      'Patent',
      req.params.id,
      oldValues,
      null,
      req
    );

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

const extractField = (obj, ...keys) => {
  if (!obj || typeof obj !== 'object') return '';
  const objKeys = Object.keys(obj);
  for (const k of keys) {
    const cleanTarget = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const ok of objKeys) {
      const cleanOk = ok.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanOk === cleanTarget && obj[ok] !== undefined && obj[ok] !== null && String(obj[ok]).trim() !== '') {
        return obj[ok];
      }
    }
  }
  return '';
};

// @desc    Bulk Upload Patents (from parsed CSV / Excel)
// @route   POST /api/patents/bulk
// @access  Private (Admin, HOD, Coordinator, Faculty)
exports.bulkUploadPatents = async (req, res) => {
  await ensurePatentTableSchema();
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
      const academicYear = extractField(
        item,
        'academicYear', 'year', 'ay', 'period', 'academicSession'
      ) || defaultYear || '2024-2025';
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
      const description = extractField(
        item,
        'description', 'abstract', 'summary', 'claims', 'briefDescription'
      );

      // Check if entire row is empty
      if (!String(title).trim() && !String(rawInventors).trim() && !String(applicationNo).trim() && !String(patentNo).trim()) {
        return; // silently skip blank row
      }

      if (!String(title).trim()) {
        errors.push(`Row ${rowNum}: Patent Title is required.`);
        return;
      }
      if (!String(rawInventors).trim()) {
        errors.push(`Row ${rowNum}: Inventor Name(s) are required for "${String(title).trim()}".`);
        return;
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
        academicYear: String(academicYear).trim(),
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
    });

    if (validRecords.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: errors.length > 0 ? errors[0] : 'No valid patent records found to insert.',
        errors
      });
    }

    const created = await Patent.bulkCreate(validRecords, {
      transaction: t,
      returning: true
    });

    await t.commit();

    try {
      if (creatorId) {
        await logAction(
          creatorId,
          'BULK_UPLOAD_PATENTS',
          'Patent',
          null,
          null,
          { count: created.length, errorsCount: errors.length },
          req
        );
      }
    } catch (auditErr) {
      console.warn('Audit logging failed for bulk patents (ignoring):', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${created.length} patent records.`,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined,
      data: created
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

// @desc    Clear all patents (Admin / HOD)
// @route   DELETE /api/patents/clear-all
// @access  Private (Admin / HOD)
exports.clearAllPatents = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'hod' && req.user.department) {
      where.department = req.user.department;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only Administrators and HODs can clear patent records.'
      });
    }

    const count = await Patent.destroy({ where });

    await logAction(
      req.user.id,
      'CLEAR_ALL_PATENTS',
      'Patent',
      null,
      null,
      { clearedCount: count, scope: where },
      req
    );

    res.json({
      success: true,
      message: `Cleared ${count} patent records successfully.`
    });
  } catch (error) {
    console.error('Clear patents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear patents',
      error: error.message
    });
  }
};
