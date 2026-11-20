const { Publication, PublicationFaculty, Faculty, User, CitationImportBatch, PublicationCitationSnapshot, CitationYearlyDetail } = require('../models');
const { parseCitationBuffer, normalizeTitle: normTitleFn, normalizeIssn: normIssnFn, normalizeYear: normYearFn, calculateTitleSimilarity, findMatchingCitationRecord } = require('../utils/citationParser');
const { validateBulkFilename } = require('../utils/publicationFilenameValidator');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { logAction, logActionSafe } = require('../middleware/auditLogger');
const { sendNotification } = require('../middleware/notificationHelper');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { parsePagination, formatPaginationResponse } = require('../utils/paginationHelper');

/**
 * Extracts Employee ID from the beginning of a filename (e.g. 2043_Adarsh_S_V.xlsx -> '2043')
 * Preserves leading zeros and string format.
 */
const extractEmployeeIdFromFilename = (filename) => {
  if (!filename) return null;
  const base = String(filename).replace(/\.[^/.]+$/, '').trim();
  // Standard format: EmpID_Faculty_Name
  // 1. Prefixed format e.g. CU-991_Dr_Smith, F_5432_Paper
  const matchPrefixed = base.match(/^([A-Za-z]{1,4}[-_]\d+)(?:[_\-\s]|$)/);
  if (matchPrefixed) {
    return matchPrefixed[1];
  }
  // 2. Alphanumeric or numeric e.g. EMP001_Rajesh, 2043_Adarsh, 00123_Name, 2043-Adarsh
  const matchAlphaNum = base.match(/^([A-Za-z]*\d+)(?:[_\-\s]|$)/);
  if (matchAlphaNum) {
    const token = matchAlphaNum[1].trim();
    if (!['publications', 'publication', 'citations', 'citation', 'overview', 'scopus', 'wos', 'template', 'data', 'export', 'file', 'iqac'].includes(token.toLowerCase())) {
      return token;
    }
  }
  // 3. Fallback: first token delimited by _ or space or -
  const matchFirst = base.match(/^([A-Za-z0-9]+)(?:[_\-\s]|$)/);
  if (matchFirst) {
    const token = matchFirst[1].trim();
    if (!['publications', 'publication', 'citations', 'citation', 'overview', 'scopus', 'wos', 'template', 'data', 'export', 'file', 'iqac'].includes(token.toLowerCase())) {
      return token;
    }
  }
  return null;
};

const normalizeDoi = (doi) => {
  if (!doi) return null;
  let cleaned = String(doi).trim();
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();
  if (['n/a', 'na', 'nil', 'null', '-', '--', 'none', 'tbd', 'undefined', 'nan'].includes(lower)) return null;
  cleaned = cleaned.replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, '').trim().toLowerCase();
  return cleaned || null;
};

const normalizeTitle = (title) => {
  if (!title) return '';
  return String(title)
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizePublicationYear = (year, pubDate, academicYear) => {
  if (year) {
    const yStr = String(year).trim();
    const match = yStr.match(/\b(19\d\d|20\d\d)\b/);
    if (match) return match[1];
  }
  if (pubDate) {
    const dStr = String(pubDate).trim();
    const match = dStr.match(/\b(19\d\d|20\d\d)\b/);
    if (match) return match[1];
  }
  if (academicYear) {
    const aStr = String(academicYear).trim();
    const match = aStr.match(/\b(19\d\d|20\d\d)\b/);
    if (match) return match[1];
  }
  return null;
};

const sanitizeCitationCount = (val) => {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (['n/a', 'na', 'nil', 'null', '-', '--', 'none', 'undefined', 'nan'].includes(lower)) return null;
  const digits = str.replace(/[^0-9]/g, '');
  if (!digits && str !== '0') return null;
  const num = parseInt(digits, 10);
  return isNaN(num) ? null : num;
};

const sanitizeStringField = (val) => {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (['n/a', 'na', 'nil', 'null', '-', '--', 'none', 'undefined', 'nan'].includes(lower)) return null;
  return str;
};

const sanitizeUrl = (url) => {
  if (!url) return null;
  const str = String(url).trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (['n/a', 'na', 'nil', 'null', '-', '--', 'none', 'undefined'].includes(lower)) return null;
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return null;
  }
  return str;
};

const sanitizeDate = (val) => {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (['n/a', 'na', 'nil', 'null', '-', '--', 'pending', 'none', 'tbd', 'undefined'].includes(lower)) return null;
  if (/^\d{4,5}$/.test(str) && parseInt(str, 10) > 10000) {
    const num = parseInt(str, 10);
    const d = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let p1 = parts[0].trim();
    let p2 = parts[1].trim();
    let p3 = parts[2].trim();
    if (p1.length === 4) return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
    let day = p1.padStart(2, '0');
    let month = p2.padStart(2, '0');
    let year = p3.length === 2 ? '20' + p3 : p3;
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return `${year}-${month}-${day}`;
  }
  if (/^\d{4}$/.test(str)) return `${str}-01-01`;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
};

const sanitizeAmount = (val) => {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

// @desc    Get all publications with filters and search
// @route   GET /api/publications
// @access  Private / Public (optional)
exports.getPublications = async (req, res) => {
  try {
    const {
      journalType,
      academicYear,
      year,
      department,
      status,
      search,
      quartile
    } = req.query;

    const where = {};
    const selectedYear = (academicYear || year || '').trim();

    if (journalType && journalType !== 'all') {
      where.journalType = {
        [Op.iLike]: `%${journalType.trim()}%`
      };
    }

    if (quartile && quartile !== 'all') {
      const qClean = quartile.trim();
      if (qClean.toLowerCase() === 'unavailable' || qClean.toLowerCase() === 'none') {
        where[Op.or] = [
          { quartile: null },
          { quartile: '' },
          { quartileStatus: { [Op.in]: ['Not Indexed', 'Not Available', 'Lookup Failed', 'Verification Required', 'Pending'] } }
        ];
      } else {
        where.quartile = qClean.toUpperCase();
      }
    }

    if (selectedYear && selectedYear !== 'all') {
      where[Op.or] = [
        { publicationYear: selectedYear },
        { academicYear: selectedYear },
        { academicYear: { [Op.like]: `${selectedYear}%` } }
      ];
    }

    // Role-based data isolation (if user is authenticated)
    if (req.user) {
      if (req.user.role === 'faculty') {
        // Faculty can see their own + finalized/approved department records
        // Or view all approved records, and their own drafts
      } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
        if (req.user.department && req.user.department !== 'All') {
          where.department = {
            [Op.iLike]: `%${req.user.department}%`
          };
        }
      } else if (req.user.role === 'authority') {
        where.status = 'finalized';
      }
    }

    // Explicit department filter (Admin / Authority / Visitor / General query)
    if (department && department !== 'all') {
      where.department = {
        [Op.iLike]: `%${department.replace(/-/g, '%')}%`
      };
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      const searchConditions = [
        { authorName: { [Op.iLike]: q } },
        { authorFullNames: { [Op.iLike]: q } },
        { title: { [Op.iLike]: q } },
        { journalName: { [Op.iLike]: q } },
        { publisher: { [Op.iLike]: q } },
        { journalType: { [Op.iLike]: q } },
        { doi: { [Op.iLike]: q } },
        { issn: { [Op.iLike]: q } },
        { isbn: { [Op.iLike]: q } },
        { coden: { [Op.iLike]: q } },
        { department: { [Op.iLike]: q } }
      ];
      if (where[Op.or]) {
        where[Op.and] = [
          { [Op.or]: where[Op.or] },
          { [Op.or]: searchConditions }
        ];
        delete where[Op.or];
      } else {
        where[Op.or] = searchConditions;
      }
    }

    const { page, limit, offset, isExport } = parsePagination(req.query);

    const { count, rows: publications } = await Publication.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: PublicationFaculty,
          as: 'facultyAssociations',
          attributes: ['id', 'facultyId', 'employeeId', 'facultyName', 'department', 'sourceFile', 'indexing'],
          required: false
        }
      ],
      order: [
        ['publicationDate', 'DESC NULLS LAST'],
        ['academicYear', 'DESC NULLS LAST'],
        ['id', 'ASC']
      ],
      limit: isExport ? undefined : limit,
      offset: isExport ? undefined : offset,
      distinct: true
    });

    res.json(formatPaginationResponse({
      count,
      rows: publications,
      page,
      limit
    }));
  } catch (error) {
    console.error('Get publications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve publications',
      error: error.message
    });
  }
};

// @desc    Get aggregate publication stats
// @route   GET /api/publications/stats
// @access  Private / Public
exports.getPublicationStats = async (req, res) => {
  try {
    const { year, department } = req.query;
    const where = {};

    if (year && year !== 'all') {
      const yClean = year.trim();
      where[Op.or] = [
        { publicationYear: yClean },
        { academicYear: yClean },
        { academicYear: { [Op.like]: `${yClean}%` } }
      ];
    }
    if (department && department !== 'all') {
      where.department = { [Op.iLike]: `%${department}%` };
    }

    const allPubs = await Publication.findAll({
      where,
      include: [
        {
          model: PublicationFaculty,
          as: 'facultyAssociations',
          attributes: ['department'],
          required: false
        }
      ]
    });

    let scopusCount = 0;
    let wosCount = 0;
    let bothCount = 0;
    let otherCount = 0;
    let totalCitations = 0;

    const departmentBreakdown = {};
    const yearBreakdown = {};
    const quartileDistribution = {
      Q1: 0,
      Q2: 0,
      Q3: 0,
      Q4: 0,
      Unavailable: 0
    };
    const quartileDepartmentBreakdown = {
      Q1: {},
      Q2: {},
      Q3: {},
      Q4: {},
      Unavailable: {}
    };

    allPubs.forEach(p => {
      // Scopus CiteScore Quartile distribution
      const q = (p.quartile || '').toUpperCase().trim();
      const normQ = ['Q1', 'Q2', 'Q3', 'Q4'].includes(q) ? q : 'Unavailable';
      if (normQ === 'Q1') quartileDistribution.Q1++;
      else if (normQ === 'Q2') quartileDistribution.Q2++;
      else if (normQ === 'Q3') quartileDistribution.Q3++;
      else if (normQ === 'Q4') quartileDistribution.Q4++;
      else quartileDistribution.Unavailable++;

      // Department-wise quartile attribution (multi-department co-authored papers count once per contributing department)
      const qDepts = new Set();
      if (Array.isArray(p.facultyAssociations) && p.facultyAssociations.length > 0) {
        p.facultyAssociations.forEach(fa => {
          const d = (fa.department || '').trim();
          if (d) qDepts.add(d);
        });
      }
      if (qDepts.size === 0) {
        const d = (p.department || '').trim();
        if (d) qDepts.add(d);
        else qDepts.add('Unassigned');
      }
      qDepts.forEach(dept => {
        quartileDepartmentBreakdown[normQ][dept] = (quartileDepartmentBreakdown[normQ][dept] || 0) + 1;
      });

      const type = (p.journalType || '').toLowerCase();
      const isScopus = type.includes('scopus');
      const isWos = type.includes('wos') || type.includes('web of science');

      if (isScopus && isWos) {
        bothCount++;
        scopusCount++;
        wosCount++;
      } else if (isScopus) {
        scopusCount++;
      } else if (isWos) {
        wosCount++;
      } else {
        otherCount++;
      }

      if (p.citationCount !== null && p.citationCount !== undefined) {
        totalCitations += Number(p.citationCount) || 0;
      }

      // Dept count
      const dept = p.department || 'Unassigned';
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;

      // Year count
      const y = p.publicationYear || p.academicYear || 'Unknown';
      yearBreakdown[y] = (yearBreakdown[y] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total: allPubs.length,
        scopus: scopusCount,
        wos: wosCount,
        both: bothCount,
        other: otherCount,
        totalCitations,
        departmentBreakdown,
        yearBreakdown,
        quartileDistribution,
        quartileDepartmentBreakdown
      }
    });
  } catch (error) {
    console.error('Get publication stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate publication statistics',
      error: error.message
    });
  }
};

// @desc    Get verified faculty lookup directory for publications bulk upload
// @route   GET /api/publications/faculty-directory
// @access  Private (Admin, Coordinator, HOD, Faculty)
exports.getPublicationFacultyDirectory = async (req, res) => {
  try {
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Faculty', false);

    const allFaculty = await Faculty.findAll({
      where: scopeWhere,
      attributes: ['id', 'employeeId', 'name', 'department', 'designation', 'academicYear', 'createdAt'],
      order: [['academicYear', 'DESC'], ['createdAt', 'DESC']]
    });

    const canonicalMap = {};
    const conflictSet = new Set();

    for (const f of allFaculty) {
      const rawId = f.employeeId;
      if (!rawId) continue;
      const cleanId = String(rawId).trim();
      if (!cleanId) continue;

      if (!canonicalMap[cleanId]) {
        canonicalMap[cleanId] = {
          id: f.id,
          employeeId: cleanId,
          name: f.name ? f.name.trim() : '',
          department: f.department ? f.department.trim() : '',
          designation: f.designation ? f.designation.trim() : '',
          academicYear: f.academicYear || '',
          hasConflict: false
        };
      } else {
        const existing = canonicalMap[cleanId];
        const newName = (f.name || '').trim().toLowerCase();
        const existingName = (existing.name || '').trim().toLowerCase();
        const newDept = (f.department || '').trim().toLowerCase();
        const existingDept = (existing.department || '').trim().toLowerCase();

        if (newName !== existingName || newDept !== existingDept) {
          conflictSet.add(cleanId);
          existing.hasConflict = true;
        }
      }
    }

    res.json({
      success: true,
      data: canonicalMap,
      conflicts: Array.from(conflictSet)
    });
  } catch (error) {
    console.error('Get publication faculty directory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve faculty directory',
      error: error.message
    });
  }
};

// @desc    Get single publication by ID
// @route   GET /api/publications/:id
// @access  Private
exports.getPublication = async (req, res) => {
  try {
    const publication = await Publication.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: PublicationFaculty,
          as: 'facultyAssociations',
          attributes: ['id', 'facultyId', 'employeeId', 'facultyName', 'department', 'sourceFile', 'indexing'],
          required: false
        }
      ]
    });

    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication record not found'
      });
    }

    res.json({
      success: true,
      data: publication
    });
  } catch (error) {
    console.error('Get publication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new publication
// @route   POST /api/publications
// @access  Private
exports.createPublication = async (req, res) => {
  try {
    const {
      authorName,
      authorFullNames,
      title,
      journalName,
      publisher,
      journalType,
      department,
      academicYear,
      publicationYear,
      publicationDate,
      doi,
      issn,
      isbn,
      coden,
      volume,
      issue,
      pageNumber,
      impactFactor,
      citationCount,
      paperUrl,
      abstract,
      status
    } = req.body;

    const resolvedAuthor = (authorName || authorFullNames || '').trim();
    const resolvedTitle = (title || '').trim();
    const resolvedJournal = (journalName || '').trim();
    const resolvedType = (journalType || '').trim();

    // Validation for required fields
    if (!resolvedAuthor || !resolvedTitle || !resolvedJournal || !resolvedType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Authors, Publication Title, Journal Name, and Journal Type.'
      });
    }

    const assignedDept = req.user.role === 'admin' ? (department || 'General') : (req.user.department || 'General');
    const cleanPubYear = normalizePublicationYear(publicationYear, publicationDate, academicYear);
    const assignedYear = academicYear ? academicYear.trim() : (cleanPubYear ? String(cleanPubYear) : null);
    const cleanDoi = normalizeDoi(doi);
    const finalStatus = (['admin', 'coordinator', 'hod'].includes(req.user.role) && status)
      ? status
      : (req.user.role === 'admin' ? 'approved' : 'submitted');

    // Duplicate detection on single creation
    if (cleanDoi) {
      const existingDoi = await Publication.findOne({
        where: {
          [Op.and]: [
            sequelize.where(
              sequelize.fn('LOWER', sequelize.col('doi')),
              cleanDoi.toLowerCase()
            )
          ]
        }
      });
      if (existingDoi) {
        return res.status(409).json({
          success: false,
          message: `Publication with DOI "${cleanDoi}" already exists in the database.`,
          duplicateId: existingDoi.id
        });
      }
    }

    if (resolvedTitle && cleanPubYear) {
      const normNewTitle = normalizeTitle(resolvedTitle);
      const candidates = await Publication.findAll({
        where: {
          [Op.or]: [
            { publicationYear: cleanPubYear },
            { academicYear: cleanPubYear },
            { academicYear: { [Op.like]: `${cleanPubYear}%` } }
          ]
        },
        attributes: ['id', 'title', 'publicationYear', 'academicYear']
      });
      const dup = candidates.find(c => normalizeTitle(c.title) === normNewTitle);
      if (dup) {
        return res.status(409).json({
          success: false,
          message: `Publication with title "${resolvedTitle}" in year ${cleanPubYear} already exists in the database.`,
          duplicateId: dup.id
        });
      }
    }

    const publication = await Publication.create({
      authorName: resolvedAuthor,
      authorFullNames: sanitizeStringField(authorFullNames),
      title: resolvedTitle,
      journalName: resolvedJournal,
      publisher: sanitizeStringField(publisher),
      journalType: resolvedType,
      department: assignedDept.trim(),
      academicYear: assignedYear,
      publicationYear: cleanPubYear,
      publicationDate: sanitizeDate(publicationDate),
      doi: cleanDoi,
      issn: sanitizeStringField(issn),
      isbn: sanitizeStringField(isbn),
      coden: sanitizeStringField(coden),
      volume: sanitizeStringField(volume),
      issue: sanitizeStringField(issue),
      pageNumber: sanitizeStringField(pageNumber),
      impactFactor: impactFactor ? parseFloat(impactFactor) : null,
      citationCount: sanitizeCitationCount(citationCount),
      paperUrl: sanitizeUrl(paperUrl),
      abstract: sanitizeStringField(abstract),
      status: finalStatus,
      createdBy: req.user.id
    });

    // Audit log
    await logAction(
      req.user.id,
      'CREATE_PUBLICATION',
      'Publication',
      publication.id,
      null,
      publication.toJSON(),
      req
    );

    // Asynchronously enrich with Scopus CiteScore Quartile and Citations (Non-blocking)
    setImmediate(async () => {
      try {
        const { enrichPublicationQuartile, retrievePublicationCitations } = require('../services/scopusService');
        await enrichPublicationQuartile(publication.id);
        await retrievePublicationCitations(publication.id);
      } catch (err) {
        console.warn(`[ScopusEnrichment] Async error on create for ${publication.id}:`, err.message);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Publication recorded successfully',
      data: publication
    });
  } catch (error) {
    console.error('Create publication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create publication',
      error: error.message
    });
  }
};

// @desc    Update publication
// @route   PUT /api/publications/:id
// @access  Private
exports.updatePublication = async (req, res) => {
  try {
    const publication = await Publication.findByPk(req.params.id);

    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication not found'
      });
    }

    // Role check: Faculty can only update their own records unless admin/coordinator/hod
    if (req.user.role === 'faculty' && publication.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit publications created by you.'
      });
    }

    if (['coordinator', 'hod'].includes(req.user.role) && req.user.department && publication.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot update publications outside your department.'
      });
    }

    const oldValues = publication.toJSON();

    const allowedFields = [
      'authorName', 'authorFullNames', 'title', 'journalName', 'publisher', 'journalType',
      'academicYear', 'publicationYear', 'publicationDate', 'doi', 'issn', 'isbn', 'coden',
      'volume', 'issue', 'pageNumber', 'impactFactor', 'citationCount', 'paperUrl', 'abstract'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'citationCount') {
          publication.citationCount = sanitizeCitationCount(req.body.citationCount);
        } else if (field === 'doi') {
          publication.doi = normalizeDoi(req.body.doi);
        } else if (field === 'paperUrl') {
          publication.paperUrl = sanitizeUrl(req.body.paperUrl);
        } else if (field === 'publicationDate') {
          publication.publicationDate = sanitizeDate(req.body.publicationDate);
        } else if (field === 'publicationYear') {
          publication.publicationYear = normalizePublicationYear(req.body.publicationYear, req.body.publicationDate, req.body.academicYear);
        } else {
          publication[field] = req.body[field] ? String(req.body[field]).trim() : null;
        }
      }
    });

    // Ensure author fallback if authorName is empty but authorFullNames is set
    if (!publication.authorName && publication.authorFullNames) {
      publication.authorName = publication.authorFullNames;
    }

    // Only coordinator, hod, and admin can change approval status
    if (['admin', 'coordinator', 'hod'].includes(req.user.role) && req.body.status !== undefined) {
      publication.status = req.body.status;
    }

    // Only admin can reassign department
    if (req.user.role === 'admin' && req.body.department !== undefined) {
      publication.department = req.body.department;
    }

    await publication.save();

    // Audit log
    await logAction(
      req.user.id,
      'UPDATE_PUBLICATION',
      'Publication',
      publication.id,
      oldValues,
      publication.toJSON(),
      req
    );

    // Asynchronously enrich with Scopus CiteScore Quartile and Citations (Non-blocking)
    setImmediate(async () => {
      try {
        const { enrichPublicationQuartile, retrievePublicationCitations } = require('../services/scopusService');
        await enrichPublicationQuartile(publication.id);
        await retrievePublicationCitations(publication.id);
      } catch (err) {
        console.warn(`[ScopusEnrichment] Async error on update for ${publication.id}:`, err.message);
      }
    });

    res.json({
      success: true,
      message: 'Publication updated successfully',
      data: publication
    });
  } catch (error) {
    console.error('Update publication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update publication',
      error: error.message
    });
  }
};

// @desc    Delete publication
// @route   DELETE /api/publications/:id
// @access  Private
exports.deletePublication = async (req, res) => {
  try {
    const publication = await Publication.findByPk(req.params.id);

    if (!publication) {
      return res.status(404).json({
        success: false,
        message: 'Publication not found'
      });
    }

    if (req.user.role === 'faculty' && publication.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete publications created by you.'
      });
    }

    const oldValues = publication.toJSON();
    await publication.destroy();

    await logAction(
      req.user.id,
      'DELETE_PUBLICATION',
      'Publication',
      req.params.id,
      oldValues,
      null,
      req
    );

    res.json({
      success: true,
      message: 'Publication deleted successfully'
    });
  } catch (error) {
    console.error('Delete publication error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete publication',
      error: error.message
    });
  }
};

// @desc    Refresh Scopus CiteScore Quartile for a single publication
// @route   POST /api/publications/:id/refresh-quartile
// @access  Private (Admin, HOD, Coordinator, Faculty)
exports.refreshQuartile = async (req, res) => {
  try {
    const { id } = req.params;
    const publication = await Publication.findByPk(id);
    if (!publication) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }

    const { enrichPublicationQuartile } = require('../services/scopusService');
    const enriched = await enrichPublicationQuartile(publication.id);

    res.json({
      success: true,
      message: 'Scopus CiteScore Quartile lookup completed.',
      data: enriched || publication
    });
  } catch (error) {
    console.error('Refresh quartile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh Scopus CiteScore Quartile.',
      error: error.message
    });
  }
};

// @desc    Bulk Upload Publications (from parsed Scopus CSV / Excel, WoS, or IQAC template)
// @route   POST /api/publications/bulk
// @access  Private (Admin, HOD, Coordinator, Faculty)
exports.bulkUploadPublications = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, defaultDepartment, defaultIndexing, isFacultyWiseBatch, enforceStrictModuleFilename } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No publication items provided for bulk upload.'
      });
    }

    // Role check for department assignment
    const userRole = req.user?.role;
    const userDept = req.user?.department;
    if (['coordinator', 'hod'].includes(userRole) && userDept && userDept !== 'All') {
      if (defaultDepartment && defaultDepartment.toLowerCase() !== userDept.toLowerCase()) {
        await t.rollback();
        return res.status(403).json({
          success: false,
          message: `Access denied: You are only authorized to upload publications for "${userDept}".`
        });
      }
    }

    // Pre-fetch all faculty matching user's authorized scope
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Faculty', false);
    const allFaculty = await Faculty.findAll({
      where: scopeWhere,
      attributes: ['id', 'employeeId', 'name', 'department', 'designation', 'academicYear', 'createdAt'],
      order: [['academicYear', 'DESC'], ['createdAt', 'DESC']],
      raw: true
    });

    // Build canonical faculty lookup map by normalized Employee ID
    const canonicalFacultyMap = {};
    const conflictFacultyIds = new Set();

    for (const f of allFaculty) {
      if (!f.employeeId) continue;
      const cleanId = String(f.employeeId).trim();
      if (!cleanId) continue;

      if (!canonicalFacultyMap[cleanId]) {
        canonicalFacultyMap[cleanId] = {
          id: f.id,
          employeeId: cleanId,
          name: f.name ? f.name.trim() : '',
          department: f.department ? f.department.trim() : '',
          designation: f.designation ? f.designation.trim() : '',
          academicYear: f.academicYear || '',
          hasConflict: false
        };
      } else {
        const existing = canonicalFacultyMap[cleanId];
        const newName = (f.name || '').trim().toLowerCase();
        const existingName = (existing.name || '').trim().toLowerCase();
        const newDept = (f.department || '').trim().toLowerCase();
        const existingDept = (existing.department || '').trim().toLowerCase();

        if (newName !== existingName || newDept !== existingDept) {
          conflictFacultyIds.add(cleanId);
          existing.hasConflict = true;
        }
      }
    }

    // Pre-fetch existing publications for robust duplicate detection
    const existingPubs = await Publication.findAll({
      attributes: ['id', 'doi', 'title', 'publicationYear', 'academicYear', 'journalType', 'citationCount'],
      raw: true
    });

    const existingDoiMap = new Map();
    const existingTitleYearMap = new Map();

    existingPubs.forEach(p => {
      const cleanD = normalizeDoi(p.doi);
      if (cleanD) {
        existingDoiMap.set(cleanD.toLowerCase(), p);
      }
      const normT = normalizeTitle(p.title);
      const y = normalizePublicationYear(p.publicationYear, null, p.academicYear);
      if (normT && y) {
        existingTitleYearMap.set(`${normT}::${y}`, p);
      }
    });

    // Pre-fetch existing publication-faculty associations to prevent duplicate linking
    const existingAssocs = await PublicationFaculty.findAll({
      attributes: ['publicationId', 'employeeId'],
      raw: true
    });

    const existingAssociationsSet = new Set(
      existingAssocs.map(a => `${a.publicationId}::${String(a.employeeId).trim()}`)
    );

    // In-batch tracking structures
    const batchDoiMap = new Map();
    const batchTitleYearMap = new Map();
    const batchAssociationsSet = new Set();

    const validPublicationsToCreate = [];
    const associationsToCreate = [];
    const existingLinked = [];
    const duplicates = [];
    const errors = [];
    const indexingUpdates = new Map();

    const hasMultiFileOrFolderContext = Boolean(
      isFacultyWiseBatch ||
      items.some(it => it.sourceFile && extractEmployeeIdFromFilename(it.sourceFile))
    );

    const lookupFacultyByEmpId = (empId) => {
      if (!empId) return null;
      const direct = canonicalFacultyMap[empId];
      if (direct) return direct;
      const lower = String(empId).trim().toLowerCase();
      return Object.values(canonicalFacultyMap).find(
        (f) => String(f.employeeId).trim().toLowerCase() === lower
      ) || null;
    };

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const rowNum = item.row || (index + 1);
      const sourceFile = item.sourceFile || '';

      // Enforce standardized module filename rules when sourceFile is present
      if (sourceFile) {
        const filenameCheck = validateBulkFilename(sourceFile, 'publications');
        if (!filenameCheck.valid) {
          const isAlwaysBlocked =
            filenameCheck.reasonCode === 'wrong_module' ||
            filenameCheck.reasonCode === 'invalid_extension' ||
            Boolean(enforceStrictModuleFilename);
          if (isAlwaysBlocked) {
            errors.push({
              row: rowNum,
              sourceFile,
              title: item.title || item['Title'] || 'Untitled',
              status: 'needs_review',
              issues: filenameCheck.error
            });
            continue;
          }
        }
      }

      // 1. Resolve and verify faculty identity from Employee ID
      let rawEmpId = item.employeeId || item['Employee ID'] || item['Emp ID'];
      if (!rawEmpId && sourceFile) {
        const filenameCheck = validateBulkFilename(sourceFile, 'publications');
        rawEmpId = filenameCheck.employeeId || extractEmployeeIdFromFilename(sourceFile);
      }

      const cleanEmpId = rawEmpId ? String(rawEmpId).trim() : null;
      let effectiveDept = 'General';
      let verifiedFacultyName = null;
      let verifiedFacultyId = null;

      if (cleanEmpId) {
        const matchedFaculty = lookupFacultyByEmpId(cleanEmpId);
        if (!matchedFaculty) {
          errors.push({
            row: rowNum,
            sourceFile,
            title: item.title || item['Title'] || 'Untitled',
            status: 'needs_review',
            issues: `Employee ID "${cleanEmpId}" does not exist in Faculty Directory.`
          });
          continue;
        }

        if (matchedFaculty.hasConflict) {
          errors.push({
            row: rowNum,
            sourceFile,
            title: item.title || item['Title'] || 'Untitled',
            status: 'needs_review',
            issues: `Employee ID "${cleanEmpId}" has conflicting identities in Faculty Directory.`
          });
          continue;
        }

        // Server-side authorization check: verify user is authorized for faculty member's department
        const verifiedDept = matchedFaculty.department;
        if (['coordinator', 'hod'].includes(userRole) && userDept && userDept !== 'All') {
          if (verifiedDept.toLowerCase() !== userDept.toLowerCase()) {
            errors.push({
              row: rowNum,
              sourceFile,
              title: item.title || item['Title'] || 'Untitled',
              status: 'unauthorized',
              issues: `Access denied: Faculty member "${matchedFaculty.name}" belongs to "${verifiedDept}", but you are only authorized for "${userDept}".`
            });
            continue;
          }
        }

        effectiveDept = verifiedDept;
        verifiedFacultyName = matchedFaculty.name;
        verifiedFacultyId = matchedFaculty.id;
      } else if (hasMultiFileOrFolderContext) {
        // In a faculty-wise batch, missing employee ID must be flagged for review
        errors.push({
          row: rowNum,
          sourceFile,
          title: item.title || item['Title'] || 'Untitled',
          status: 'needs_review',
          issues: `Missing Employee ID in filename "${sourceFile || 'unnamed file'}". Filename must start with EmpID (e.g. 2043_Name.xlsx).`
        });
        continue;
      } else {
        // Legacy single file without Employee ID: use row department or user default
        const rawDepartment = item.department || item['Department'] || defaultDepartment || userDept || 'General';
        if (['coordinator', 'hod'].includes(userRole) && userDept && userDept !== 'All') {
          effectiveDept = userDept;
        } else {
          effectiveDept = String(rawDepartment).trim() || 'General';
        }
      }

      // 2. Extract approved fields with Scopus, WoS, and IQAC aliases
      const rawAuthors = item['Authors'] !== undefined ? item['Authors']
        : (item['AU'] !== undefined ? item['AU']
        : (item.authorName || item['Author Name'] || item['Author'] || ''));

      const rawFullNames = item['Author full names'] !== undefined ? item['Author full names']
        : (item['AF'] !== undefined ? item['AF']
        : (item.authorFullNames || item['Author Full Names'] || ''));

      const rawTitle = item['Title'] !== undefined ? item['Title']
        : (item['Article Title'] !== undefined ? item['Article Title']
        : (item['TI'] !== undefined ? item['TI']
        : (item.title || item['Publication Title'] || item['Paper Title'] || '')));

      // Publication Year must come from row! (No defaultYear fallback per Phase 6)
      const rawYear = item['Year'] !== undefined ? item['Year']
        : (item['Publication Year'] !== undefined ? item['Publication Year']
        : (item['PY'] !== undefined ? item['PY']
        : (item.publicationYear || item.academicYear || item['Academic Year'] || '')));

      const rawJournal = item['Source title'] !== undefined ? item['Source title']
        : (item['Source Title'] !== undefined ? item['Source Title']
        : (item['SO'] !== undefined ? item['SO']
        : (item.journalName || item['Journal Name'] || item['Journal'] || '')));

      const rawCitations = item['Cited by'] !== undefined ? item['Cited by']
        : (item['Times Cited, WoS Core'] !== undefined ? item['Times Cited, WoS Core']
        : (item['Times Cited, All Databases'] !== undefined ? item['Times Cited, All Databases']
        : (item['TC'] !== undefined ? item['TC']
        : (item.citationCount !== undefined ? item.citationCount : (item['Citations'] !== undefined ? item['Citations'] : null)))));

      const rawDoi = item['DOI'] !== undefined ? item['DOI']
        : (item['DI'] !== undefined ? item['DI']
        : (item.doi || item['DOI Number'] || ''));

      const rawLink = item['Link'] !== undefined ? item['Link']
        : (item['URL'] !== undefined ? item['URL']
        : (item.paperUrl || item['Publication Link'] || item['Paper Link'] || ''));

      const rawPublisher = item['Publisher'] !== undefined ? item['Publisher']
        : (item['PU'] !== undefined ? item['PU']
        : (item.publisher || ''));

      const rawIssn = item['ISSN'] !== undefined ? item['ISSN']
        : (item['SN'] !== undefined ? item['SN']
        : (item.issn || ''));

      const rawIsbn = item['ISBN'] !== undefined ? item['ISBN']
        : (item['BN'] !== undefined ? item['BN']
        : (item.isbn || ''));

      const rawCoden = item['CODEN'] !== undefined ? item['CODEN']
        : (item['CA'] !== undefined ? item['CA']
        : (item.coden || ''));

      // Optional legacy fields
      const rawDate = item.publicationDate || item['Publication Date'] || item['Date'] || null;
      const rawVolume = item.volume || item['Volume'] || '';
      const rawIssue = item.issue || item['Issue'] || '';
      const rawPageNumber = item.pageNumber || item['Page Number'] || item['Pages'] || '';
      const rawImpactFactor = item.impactFactor || item['Impact Factor'] || null;
      const rawAbstract = item.abstract || item['Abstract'] || '';
      const rawJournalType = item.indexing || item['Indexing'] || item.journalType || item['Journal Type'] || defaultIndexing || 'Scopus';

      // 3. Clean and sanitize fields
      const cleanAuthors = String(rawAuthors || '').trim();
      const cleanFullNames = sanitizeStringField(rawFullNames);
      const effectiveAuthor = cleanAuthors || cleanFullNames || '';
      const cleanTitle = String(rawTitle || '').trim();
      const cleanJournal = String(rawJournal || '').trim();
      const cleanPubYear = normalizePublicationYear(rawYear, rawDate);
      const cleanDoi = normalizeDoi(rawDoi);
      const cleanLink = sanitizeUrl(rawLink);
      const cleanPublisher = sanitizeStringField(rawPublisher);
      const cleanIssn = sanitizeStringField(rawIssn);
      const cleanIsbn = sanitizeStringField(rawIsbn);
      const cleanCoden = sanitizeStringField(rawCoden);
      const cleanCitations = sanitizeCitationCount(rawCitations);

      // 4. Validate required fields
      const missingRequired = [];
      if (!effectiveAuthor) missingRequired.push('Authors / Full Names');
      if (!cleanTitle) missingRequired.push('Publication Title');
      if (!cleanJournal) missingRequired.push('Source title (Journal Name)');
      if (!cleanPubYear) missingRequired.push('Valid 4-digit Publication Year');

      if (missingRequired.length > 0) {
        errors.push({
          row: rowNum,
          sourceFile,
          title: cleanTitle || 'Untitled',
          status: 'needs_review',
          issues: `Missing required field(s): ${missingRequired.join(', ')}`
        });
        continue;
      }

      // 5. Normalize indexing classification
      let normalizedType = String(rawJournalType).trim() || 'Scopus';
      const lowerType = normalizedType.toLowerCase();
      if (lowerType.includes('scopus') && (lowerType.includes('wos') || lowerType.includes('web of science'))) {
        normalizedType = 'Scopus & WoS';
      } else if (lowerType.includes('scopus')) {
        normalizedType = 'Scopus';
      } else if (lowerType.includes('wos') || lowerType.includes('web of science')) {
        normalizedType = 'WoS (Web of Science)';
      } else if (lowerType.includes('ugc')) {
        normalizedType = 'UGC-CARE';
      }

      // 6. Deduplication & Target Publication Lookup
      let targetPubId = null;
      let existingPub = null;

      // Primary Match: Normalized DOI
      if (cleanDoi) {
        const lowerDoi = cleanDoi.toLowerCase();
        if (existingDoiMap.has(lowerDoi)) {
          existingPub = existingDoiMap.get(lowerDoi);
          targetPubId = existingPub.id;
        } else if (batchDoiMap.has(lowerDoi)) {
          targetPubId = batchDoiMap.get(lowerDoi).id;
        }
      }

      // Secondary Match: Normalized Title + Year (if DOI not matched)
      const normTitle = normalizeTitle(cleanTitle);
      const titleYearKey = `${normTitle}::${cleanPubYear}`;

      if (!targetPubId) {
        if (existingTitleYearMap.has(titleYearKey)) {
          existingPub = existingTitleYearMap.get(titleYearKey);
          targetPubId = existingPub.id;
        } else if (batchTitleYearMap.has(titleYearKey)) {
          targetPubId = batchTitleYearMap.get(titleYearKey).id;
        }
      }

      // ── CASE A: Publication ALREADY EXISTS (in DB or earlier in batch) ──
      if (targetPubId) {
        if (cleanEmpId) {
          const assocKey = `${targetPubId}::${cleanEmpId}`;
          if (existingAssociationsSet.has(assocKey) || batchAssociationsSet.has(assocKey)) {
            duplicates.push({
              row: rowNum,
              sourceFile,
              title: cleanTitle,
              employeeId: cleanEmpId,
              facultyName: verifiedFacultyName,
              reason: `Duplicate association: Faculty member "${verifiedFacultyName}" (${cleanEmpId}) is already associated with this publication.`
            });
            continue;
          }

          // Stage new faculty association for existing publication
          batchAssociationsSet.add(assocKey);
          associationsToCreate.push({
            id: crypto.randomUUID(),
            publicationId: targetPubId,
            facultyId: verifiedFacultyId,
            employeeId: cleanEmpId,
            facultyName: verifiedFacultyName,
            department: effectiveDept,
            sourceFile: sourceFile || null,
            indexing: normalizedType
          });

          existingLinked.push({
            row: rowNum,
            sourceFile,
            publicationId: targetPubId,
            title: cleanTitle,
            employeeId: cleanEmpId,
            facultyName: verifiedFacultyName,
            department: effectiveDept
          });

          // Safely update existing publication metadata if new valid non-empty fields are supplied
          if (existingPub) {
            const updates = {};
            if (!existingPub.doi && cleanDoi) updates.doi = cleanDoi;
            if (!existingPub.issn && cleanIssn) updates.issn = cleanIssn;
            if (!existingPub.publisher && cleanPublisher) updates.publisher = cleanPublisher;
            if (!existingPub.paperUrl && cleanLink) updates.paperUrl = cleanLink;
            if (!existingPub.authorFullNames && cleanFullNames) updates.authorFullNames = cleanFullNames;
            if (!existingPub.volume && rawVolume) updates.volume = sanitizeStringField(rawVolume);
            if (!existingPub.issue && rawIssue) updates.issue = sanitizeStringField(rawIssue);
            if (!existingPub.pageNumber && rawPageNumber) updates.pageNumber = sanitizeStringField(rawPageNumber);
            if ((existingPub.citationCount === null || existingPub.citationCount === undefined) && cleanCitations !== null) {
              updates.citationCount = cleanCitations;
            }

            if (Object.keys(updates).length > 0) {
              await Publication.update(updates, { where: { id: existingPub.id }, transaction: t });
            }
          }

          // Check if indexing should be merged to Scopus & WoS
          if (existingPub && normalizedType && existingPub.journalType !== normalizedType) {
            const prevType = (existingPub.journalType || '').toLowerCase();
            const currType = normalizedType.toLowerCase();
            if ((prevType.includes('scopus') && currType.includes('wos')) ||
                (prevType.includes('wos') && currType.includes('scopus'))) {
              indexingUpdates.set(existingPub.id, 'Scopus & WoS');
            }
          }
        } else {
          duplicates.push({
            row: rowNum,
            sourceFile,
            title: cleanTitle,
            doi: cleanDoi,
            reason: `Publication already exists in platform.`
          });
        }
        continue;
      }

      // ── CASE B: Completely NEW Publication ──
      const newPubId = crypto.randomUUID();

      const newPubRecord = {
        id: newPubId,
        authorName: cleanAuthors || cleanFullNames,
        authorFullNames: cleanFullNames,
        title: cleanTitle,
        journalName: cleanJournal,
        publisher: cleanPublisher,
        journalType: normalizedType,
        department: effectiveDept,
        academicYear: cleanPubYear,
        publicationYear: cleanPubYear ? String(cleanPubYear).trim().substring(0, 10) : null,
        publicationDate: sanitizeDate(rawDate),
        doi: cleanDoi,
        issn: cleanIssn,
        isbn: cleanIsbn,
        coden: cleanCoden,
        volume: sanitizeStringField(rawVolume),
        issue: sanitizeStringField(rawIssue),
        pageNumber: sanitizeStringField(rawPageNumber),
        impactFactor: sanitizeAmount(rawImpactFactor),
        citationCount: cleanCitations,
        paperUrl: cleanLink,
        abstract: sanitizeStringField(rawAbstract),
        status: userRole === 'admin' ? 'approved' : 'submitted',
        createdBy: req.user?.id
      };

      validPublicationsToCreate.push(newPubRecord);

      // Register in batch maps for cross-file duplicate detection within the same upload
      if (cleanDoi) {
        batchDoiMap.set(cleanDoi.toLowerCase(), { id: newPubId, record: newPubRecord });
      }
      batchTitleYearMap.set(titleYearKey, { id: newPubId, record: newPubRecord });

      // Associate verified faculty member with new publication
      if (cleanEmpId) {
        const assocKey = `${newPubId}::${cleanEmpId}`;
        batchAssociationsSet.add(assocKey);
        associationsToCreate.push({
          id: crypto.randomUUID(),
          publicationId: newPubId,
          facultyId: verifiedFacultyId,
          employeeId: cleanEmpId,
          facultyName: verifiedFacultyName,
          department: effectiveDept,
          sourceFile: sourceFile || null,
          indexing: normalizedType
        });
      }
    }

    // If no eligible new publications AND no eligible new faculty associations:
    if (validPublicationsToCreate.length === 0 && associationsToCreate.length === 0) {
      await t.rollback();
      return res.status(200).json({
        success: false,
        message: 'No eligible new publication records or faculty links to process.',
        count: 0,
        createdCount: 0,
        linkedCount: 0,
        duplicatesCount: duplicates.length,
        duplicates,
        errorsCount: errors.length,
        errors
      });
    }

    // 7. Atomic transaction commit
    let created = [];
    if (validPublicationsToCreate.length > 0) {
      created = await Publication.bulkCreate(validPublicationsToCreate, {
        transaction: t,
        returning: true
      });
    }

    if (associationsToCreate.length > 0) {
      await PublicationFaculty.bulkCreate(associationsToCreate, {
        transaction: t,
        ignoreDuplicates: true
      });
    }

    if (indexingUpdates.size > 0) {
      for (const [id, jType] of indexingUpdates.entries()) {
        await Publication.update(
          { journalType: jType },
          { where: { id }, transaction: t }
        );
      }
    }

    await t.commit();

    // 8. Audit log
    try {
      if (req.user) {
        await logAction(
          req.user.id || 'system-user',
          'BULK_UPLOAD_PUBLICATIONS',
          'Publication',
          null,
          null,
          {
            createdCount: validPublicationsToCreate.length,
            linkedCount: existingLinked.length,
            duplicatesCount: duplicates.length,
            errorsCount: errors.length
          },
          req
        );
      }
    } catch (auditErr) {
      console.warn('Audit logging warning during bulk publications upload:', auditErr.message);
    }

    // Asynchronously enrich with Scopus CiteScore Quartile, Citations, and Centralized Journal Metrics (Non-blocking)
    if (created && created.length > 0) {
      setImmediate(async () => {
        try {
          const { enrichPublicationQuartile, retrievePublicationCitations, retrieveJournalMetrics } = require('../services/scopusService');
          for (const pub of created) {
            try {
              if (pub.journalName || pub.issn) {
                const jRes = await retrieveJournalMetrics({
                  issn: pub.issn,
                  journalTitle: pub.journalName
                });
                if (jRes && jRes.scopusSourceId && !pub.scopusSourceId) {
                  await Publication.update(
                    { scopusSourceId: jRes.scopusSourceId },
                    { where: { id: pub.id } }
                  );
                }
              }
              await enrichPublicationQuartile(pub.id);
              if (pub.doi || pub.title) {
                await retrievePublicationCitations(pub.id);
              }
            } catch (pErr) {
              console.warn(`[ScopusEnrichment] Async notice for pub ${pub.id}:`, pErr.message);
            }
          }
        } catch (err) {
          console.warn('[ScopusEnrichment] Async error on bulk upload:', err.message);
        }
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully processed publications: ${validPublicationsToCreate.length} new publication(s) created, ${existingLinked.length} faculty link(s) established.` +
        (duplicates.length > 0 ? ` (${duplicates.length} duplicates skipped)` : '') +
        (errors.length > 0 ? ` (${errors.length} incomplete rows flagged)` : ''),
      count: validPublicationsToCreate.length + existingLinked.length,
      createdCount: validPublicationsToCreate.length,
      linkedCount: existingLinked.length,
      duplicatesCount: duplicates.length,
      duplicates: duplicates.length > 0 ? duplicates : undefined,
      errorsCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      data: created,
      linked: existingLinked
    });
  } catch (error) {
    await t.rollback();
    console.error('Bulk upload publications error:', error);
    const detailMsg = error.parent?.detail || error.original?.message || error.message || 'Internal database error';
    res.status(500).json({
      success: false,
      message: `Failed to process bulk upload for publications: ${detailMsg}`,
      error: error.message,
      detail: detailMsg
    });
  }
};

// @desc    Clear all publications (Admin only or Dept HOD)
// @route   DELETE /api/publications/clear-all
// @access  Private (Admin / HOD)
exports.clearAllPublications = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'Publication', true);

    let count = 0;
    await sequelize.transaction(async (t) => {
      count = await Publication.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_PUBLICATIONS',
      title: `Cleared publications: ${scopeDescription}`,
      remarks: `Deleted ${count} publication records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Cleared ${count} publication records successfully for ${scopeDescription}.`
    });
  } catch (error) {
    console.error('Clear publications error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to clear publications'
    });
  }
};

/**
 * Validates and previews citation overview files (CSV / XLSX)
 * Matches citations to existing publications and returns comprehensive preview.
 */
exports.validateAndPreviewCitations = async (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No citation files provided. Please upload at least one .csv or .xlsx citation file.'
      });
    }

    // Resolve user's authorized scope
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Faculty', false);
    const { where: pubScopeWhere } = await resolveDepartmentScope(req, 'Publication', false);

    // Fetch canonical faculty lookup
    const allFaculty = await Faculty.findAll({
      where: scopeWhere,
      attributes: ['id', 'employeeId', 'name', 'department', 'designation', 'academicYear', 'createdAt'],
      order: [['academicYear', 'DESC'], ['createdAt', 'DESC']],
      raw: true
    });

    const canonicalFacultyMap = {};
    for (const f of allFaculty) {
      if (!f.employeeId) continue;
      const cleanId = String(f.employeeId).trim();
      if (!cleanId) continue;
      if (!canonicalFacultyMap[cleanId]) {
        canonicalFacultyMap[cleanId] = {
          id: f.id,
          employeeId: cleanId,
          name: f.name ? f.name.trim() : '',
          department: f.department ? f.department.trim() : '',
          designation: f.designation ? f.designation.trim() : ''
        };
      }
    }

    // Fetch existing publications in scope
    const allPubs = await Publication.findAll({
      where: pubScopeWhere,
      attributes: ['id', 'title', 'doi', 'issn', 'publicationYear', 'academicYear', 'journalName', 'citationCount', 'department', 'scopusEid'],
      raw: true
    });

    // In-memory indexing of publications for fast multi-field matching
    const pubByDoi = {};
    const pubByEid = {};
    const pubByTitleIssnYear = {};
    const pubByTitleYearJournal = {};
    const pubByTitleIssn = {};
    const pubByTitle = {};

    for (const pub of allPubs) {
      if (pub.doi) {
        const cleanD = normalizeDoi(pub.doi);
        if (cleanD) pubByDoi[cleanD.toLowerCase()] = pub;
      }
      if (pub.scopusEid) {
        const cleanE = String(pub.scopusEid).trim().toLowerCase();
        if (cleanE) pubByEid[cleanE] = pub;
      }
      const nTitle = normTitleFn(pub.title);
      const nIssn = normIssnFn(pub.issn);
      const nYear = normYearFn(pub.publicationYear || pub.academicYear);
      const nJournal = normTitleFn(pub.journalName);

      if (nTitle && nIssn && nYear) {
        const key = `${nTitle}|${nIssn}|${nYear}`;
        if (!pubByTitleIssnYear[key]) pubByTitleIssnYear[key] = [];
        pubByTitleIssnYear[key].push(pub);
      }

      if (nTitle && nYear && nJournal) {
        const key = `${nTitle}|${nYear}|${nJournal}`;
        if (!pubByTitleYearJournal[key]) pubByTitleYearJournal[key] = [];
        pubByTitleYearJournal[key].push(pub);
      }

      if (nTitle && nIssn) {
        const key = `${nTitle}|${nIssn}`;
        if (!pubByTitleIssn[key]) pubByTitleIssn[key] = [];
        pubByTitleIssn[key].push(pub);
      }

      if (nTitle) {
        if (!pubByTitle[nTitle]) pubByTitle[nTitle] = [];
        pubByTitle[nTitle].push(pub);
      }
    }

    const processedFiles = [];
    const allRecords = [];

    for (let fIdx = 0; fIdx < files.length; fIdx++) {
      const file = files[fIdx];
      const filename = String(file.filename || `citation_file_${fIdx + 1}.csv`).trim();
      const filenameCheck = validateBulkFilename(filename, 'citations');

      if (!filenameCheck.valid) {
        processedFiles.push({
          fileIndex: fIdx,
          filename,
          employeeId: filenameCheck.employeeId || null,
          verifiedFaculty: null,
          status: 'error',
          reasonCode: filenameCheck.reasonCode,
          error: filenameCheck.error,
          warning: filenameCheck.error,
          recordCount: 0,
          matchedCount: 0,
          needsReviewCount: 0,
          notFoundCount: 0,
          detectedPeriods: []
        });
        continue;
      }

      const employeeId = filenameCheck.employeeId;
      let verifiedFaculty = null;
      let facultyError = null;

      const directFaculty = employeeId ? canonicalFacultyMap[employeeId] : null;
      const caseInsensitiveFaculty = (!directFaculty && employeeId)
        ? Object.values(canonicalFacultyMap).find(
            (f) => String(f.employeeId).trim().toLowerCase() === String(employeeId).trim().toLowerCase()
          ) || null
        : null;
      const matchedFaculty = directFaculty || caseInsensitiveFaculty;

      if (matchedFaculty) {
        verifiedFaculty = matchedFaculty;
      } else {
        facultyError = `Employee ID "${employeeId}" not found in Faculty Management directory.`;
      }

      // Decode content buffer
      let buffer;
      try {
        const rawContent = file.content || '';
        if (typeof rawContent === 'string' && rawContent.startsWith('data:')) {
          const base64Data = rawContent.split(',')[1] || '';
          buffer = Buffer.from(base64Data, 'base64');
        } else if (typeof rawContent === 'string' && !rawContent.includes('\n') && rawContent.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(rawContent)) {
          buffer = Buffer.from(rawContent, 'base64');
        } else {
          buffer = Buffer.from(String(rawContent), 'utf-8');
        }
      } catch (err) {
        processedFiles.push({
          fileIndex: fIdx,
          filename,
          employeeId: employeeId || null,
          verifiedFaculty: null,
          status: 'error',
          error: `Failed to decode file buffer: ${err.message}`,
          recordCount: 0
        });
        continue;
      }

      // Parse citation buffer
      let parsed;
      try {
        parsed = parseCitationBuffer(buffer, filename);
      } catch (err) {
        processedFiles.push({
          fileIndex: fIdx,
          filename,
          employeeId: employeeId || null,
          verifiedFaculty,
          status: 'error',
          error: `Parsing error: ${err.message}`,
          recordCount: 0
        });
        continue;
      }

      let fileMatchedCount = 0;
      let fileNeedsReviewCount = 0;
      let fileNotFoundCount = 0;

      for (let rIdx = 0; rIdx < parsed.records.length; rIdx++) {
        const rec = parsed.records[rIdx];
        const nTitle = normTitleFn(rec.documentTitle);
        const nIssn = normIssnFn(rec.issn);
        const nYear = normYearFn(rec.publicationYear);
        const nJournal = normTitleFn(rec.journalTitle);

        let matchedPub = null;
        let matchConfidence = 'none';
        let matchMethod = 'none';
        let candidateCount = 0;

        // Priority 0: Primary Match via Publication DOI
        if (rec.doi) {
          const cleanDoi = normalizeDoi(rec.doi);
          if (cleanDoi && pubByDoi[cleanDoi.toLowerCase()]) {
            matchedPub = pubByDoi[cleanDoi.toLowerCase()];
            matchConfidence = 'high';
            matchMethod = 'DOI (Direct Exact Match)';
          }
        }

        // Priority 0.5: Secondary Match via Scopus EID
        if (!matchedPub && rec.eid) {
          const cleanEid = String(rec.eid).trim().toLowerCase();
          if (cleanEid && pubByEid[cleanEid]) {
            matchedPub = pubByEid[cleanEid];
            matchConfidence = 'high';
            matchMethod = 'Scopus EID Match';
          }
        }

        if (!matchedPub && nTitle) {
          // Priority 1: Title + ISSN + Publication Year
          if (nIssn && nYear) {
            const key = `${nTitle}|${nIssn}|${nYear}`;
            const matches = pubByTitleIssnYear[key] || [];
            if (matches.length === 1) {
              matchedPub = matches[0];
              matchConfidence = 'high';
              matchMethod = 'Title + ISSN + Year';
            } else if (matches.length > 1) {
              candidateCount = matches.length;
            }
          }

          // Priority 2: Title + Year + Journal
          if (!matchedPub && candidateCount === 0 && nYear && nJournal) {
            const key = `${nTitle}|${nYear}|${nJournal}`;
            const matches = pubByTitleYearJournal[key] || [];
            if (matches.length === 1) {
              matchedPub = matches[0];
              matchConfidence = 'medium';
              matchMethod = 'Title + Year + Journal';
            } else if (matches.length > 1) {
              candidateCount = matches.length;
            }
          }

          // Priority 3: Title + ISSN
          if (!matchedPub && candidateCount === 0 && nIssn) {
            const key = `${nTitle}|${nIssn}`;
            const matches = pubByTitleIssn[key] || [];
            if (matches.length === 1) {
              matchedPub = matches[0];
              matchConfidence = 'medium';
              matchMethod = 'Title + ISSN';
            } else if (matches.length > 1) {
              candidateCount = matches.length;
            }
          }

          // Priority 4: Exact Title (Safe match if unique and title is sufficiently long)
          if (!matchedPub && candidateCount === 0) {
            const matches = pubByTitle[nTitle] || [];
            if (matches.length === 1 && nTitle.length >= 10) {
              matchedPub = matches[0];
              matchConfidence = 'medium';
              matchMethod = 'Exact Title';
            } else if (matches.length > 1) {
              candidateCount = matches.length;
            }
          }

          // Priority 5 (Resilient / Fuzzy Matching): Handles title word variations (e.g. 'high-efficient' vs 'high-efficiency')
          if (!matchedPub && candidateCount === 0 && allPubs.length > 0) {
            // Case 5A: ISSN + Year match with Title similarity >= 0.75
            if (nIssn && nYear) {
              const candidates = allPubs.filter(p => {
                const pIssn = normIssnFn(p.issn);
                const pYear = normYearFn(p.publicationYear || p.academicYear);
                if (pIssn !== nIssn || pYear !== nYear) return false;
                const sim = calculateTitleSimilarity(rec.documentTitle, p.title);
                return sim >= 0.75;
              });

              if (candidates.length === 1) {
                matchedPub = candidates[0];
                matchConfidence = 'high';
                matchMethod = 'Resilient Title + ISSN + Year';
              } else if (candidates.length > 1) {
                candidateCount = candidates.length;
              }
            }

            // Case 5B: Year + Journal match with Title similarity >= 0.80
            if (!matchedPub && candidateCount === 0 && nYear && nJournal) {
              const candidates = allPubs.filter(p => {
                const pYear = normYearFn(p.publicationYear || p.academicYear);
                const pJournal = normTitleFn(p.journalName);
                if (pYear !== nYear || pJournal !== nJournal) return false;
                const sim = calculateTitleSimilarity(rec.documentTitle, p.title);
                return sim >= 0.80;
              });

              if (candidates.length === 1) {
                matchedPub = candidates[0];
                matchConfidence = 'medium';
                matchMethod = 'Resilient Title + Year + Journal';
              } else if (candidates.length > 1) {
                candidateCount = candidates.length;
              }
            }

            // Case 5C: ISSN match with Title similarity >= 0.80
            if (!matchedPub && candidateCount === 0 && nIssn) {
              const candidates = allPubs.filter(p => {
                const pIssn = normIssnFn(p.issn);
                if (pIssn !== nIssn) return false;
                const sim = calculateTitleSimilarity(rec.documentTitle, p.title);
                return sim >= 0.80;
              });

              if (candidates.length === 1) {
                matchedPub = candidates[0];
                matchConfidence = 'medium';
                matchMethod = 'Resilient Title + ISSN';
              } else if (candidates.length > 1) {
                candidateCount = candidates.length;
              }
            }

            // Case 5D: High Title similarity (>= 0.90) across all publications
            if (!matchedPub && candidateCount === 0 && nTitle.length >= 25) {
              const candidates = allPubs.filter(p => {
                const sim = calculateTitleSimilarity(rec.documentTitle, p.title);
                return sim >= 0.90;
              });

              if (candidates.length === 1) {
                matchedPub = candidates[0];
                matchConfidence = 'medium';
                matchMethod = 'Resilient Title Similarity';
              } else if (candidates.length > 1) {
                candidateCount = candidates.length;
              }
            }
          }
        }

        let status = 'Matched';
        const reviewReasons = [...rec.validationIssues];

        if (facultyError) {
          status = 'Needs Review';
          reviewReasons.unshift(facultyError);
        } else if (!rec.documentTitle) {
          status = 'Needs Review';
          reviewReasons.unshift('Missing document title in citation file.');
        } else if (candidateCount > 1) {
          status = 'Ambiguous';
          reviewReasons.unshift(`Multiple (${candidateCount}) publications match this title. Needs manual disambiguation.`);
        } else if (!matchedPub) {
          status = 'Not Found';
          reviewReasons.unshift('No existing publication found in Christ University IQAC database matching this document.');
        } else if (rec.reconciliationStatus === 'unreconciled') {
          status = 'Needs Review';
        }

        const existingTotal = matchedPub ? (matchedPub.citationCount !== null && matchedPub.citationCount !== undefined ? matchedPub.citationCount : null) : null;
        const importedTotal = rec.reportedTotal;
        const difference = (existingTotal !== null && importedTotal !== null) ? (importedTotal - existingTotal) : null;
        const isDecrease = (existingTotal !== null && importedTotal !== null && importedTotal < existingTotal);

        if (status === 'Matched') fileMatchedCount++;
        else if (status === 'Needs Review' || status === 'Ambiguous') fileNeedsReviewCount++;
        else if (status === 'Not Found') fileNotFoundCount++;

        allRecords.push({
          recordId: `${fIdx}_${rIdx}`,
          fileIndex: fIdx,
          sourceFile: filename,
          employeeId: employeeId || null,
          facultyName: verifiedFaculty ? verifiedFaculty.name : null,
          department: verifiedFaculty ? verifiedFaculty.department : null,
          rowIndex: rec.rowIndex,
          documentTitle: rec.documentTitle,
          publicationYear: rec.publicationYear,
          issn: rec.issn,
          journalTitle: rec.journalTitle,
          volume: rec.volume,
          issue: rec.issue,
          matchedPublicationId: matchedPub ? matchedPub.id : null,
          matchedPublicationTitle: matchedPub ? matchedPub.title : null,
          matchedPublicationYear: matchedPub ? (matchedPub.publicationYear || matchedPub.academicYear) : null,
          matchedPublicationDepartment: matchedPub ? matchedPub.department : null,
          matchMethod,
          matchConfidence,
          existingTotal,
          importedTotal,
          difference,
          isDecrease,
          reconciliationStatus: rec.reconciliationStatus,
          status,
          reviewReasons,
          yearlyDetails: rec.yearlyDetails
        });
      }

      processedFiles.push({
        fileIndex: fIdx,
        filename,
        checksum: parsed.checksum,
        fileFormat: parsed.fileFormat,
        employeeId: employeeId || null,
        verifiedFaculty,
        status: facultyError ? 'warning' : 'verified',
        warning: facultyError,
        recordCount: parsed.records.length,
        matchedCount: fileMatchedCount,
        needsReviewCount: fileNeedsReviewCount,
        notFoundCount: fileNotFoundCount,
        detectedPeriods: parsed.mapping.detectedPeriods
      });
    }

    // Step 2: Cross-Faculty File Duplicate and Conflict Resolution
    const pubIdToRecords = {};
    for (const rec of allRecords) {
      if (rec.matchedPublicationId) {
        if (!pubIdToRecords[rec.matchedPublicationId]) {
          pubIdToRecords[rec.matchedPublicationId] = [];
        }
        pubIdToRecords[rec.matchedPublicationId].push(rec);
      }
    }

    for (const [pubId, group] of Object.entries(pubIdToRecords)) {
      if (group.length > 1) {
        // Compare reported total and breakdown across reports
        const first = group[0];
        let hasConflict = false;

        for (let i = 1; i < group.length; i++) {
          const other = group[i];
          if (other.importedTotal !== first.importedTotal) {
            hasConflict = true;
            break;
          }
        }

        if (hasConflict) {
          for (const item of group) {
            item.status = 'Conflicting';
            item.reviewReasons.push(
              `Conflicting citation snapshot across faculty files: different citation totals reported for the same paper (${group.map(g => `${g.sourceFile}: ${g.importedTotal}`).join(', ')}). Requires user review.`
            );
          }
        } else {
          // Identical counts: keep first as Matched, mark others as Duplicate
          for (let i = 1; i < group.length; i++) {
            const item = group[i];
            if (item.status === 'Matched') {
              item.status = 'Duplicate';
              item.reviewReasons.push(
                `Duplicate citation evidence: identical citation data already provided in ${first.sourceFile} (Emp ID: ${first.employeeId}).`
              );
            }
          }
        }
      }
    }

    // Step 3: Compute Summary
    let totalMatched = 0;
    let totalNeedsReview = 0;
    let totalAmbiguous = 0;
    let totalNotFound = 0;
    let totalDuplicate = 0;
    let totalConflicting = 0;
    let eligibleUpdates = 0;

    for (const r of allRecords) {
      if (r.status === 'Matched') {
        totalMatched++;
        eligibleUpdates++;
      } else if (r.status === 'Needs Review') {
        totalNeedsReview++;
      } else if (r.status === 'Ambiguous') {
        totalAmbiguous++;
      } else if (r.status === 'Not Found') {
        totalNotFound++;
      } else if (r.status === 'Duplicate') {
        totalDuplicate++;
      } else if (r.status === 'Conflicting') {
        totalConflicting++;
      }
    }

    return res.json({
      success: true,
      files: processedFiles,
      records: allRecords,
      summary: {
        totalFiles: processedFiles.length,
        totalRecords: allRecords.length,
        matchedCount: totalMatched,
        needsReviewCount: totalNeedsReview,
        ambiguousCount: totalAmbiguous,
        notFoundCount: totalNotFound,
        duplicateCount: totalDuplicate,
        conflictingCount: totalConflicting,
        eligibleUpdatesCount: eligibleUpdates
      }
    });

  } catch (error) {
    console.error('validateAndPreviewCitations error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to parse and validate citation files'
    });
  }
};

/**
 * Confirms citation updates in a single database transaction.
 * Updates publication.citationCount and creates publication_citation_snapshots + citation_yearly_details.
 */
exports.confirmCitationsUpdate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { confirmedUpdates, batchMetadata } = req.body;

    if (!Array.isArray(confirmedUpdates) || confirmedUpdates.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No confirmed citation updates provided.'
      });
    }

    // 1. Create or resolve citation import batches
    const batchMap = {};
    if (Array.isArray(batchMetadata)) {
      for (const b of batchMetadata) {
        if (!b.filename) continue;
        const createdBatch = await CitationImportBatch.create({
          filename: b.filename,
          fileChecksum: b.fileChecksum || null,
          fileFormat: b.fileFormat || 'csv',
          employeeId: b.employeeId || 'UNKNOWN',
          facultyId: b.facultyId || null,
          facultyName: b.facultyName || null,
          department: b.department || null,
          uploadedBy: req.user.id,
          sourceType: b.sourceType || 'Scopus Citation Overview',
          totalRecords: b.totalRecords || 0,
          matchedRecords: b.matchedRecords || 0,
          needsReviewRecords: b.needsReviewRecords || 0,
          notFoundRecords: b.notFoundRecords || 0,
          duplicateRecords: b.duplicateRecords || 0,
          updatedRecords: confirmedUpdates.filter(u => u.sourceFile === b.filename).length,
          status: 'completed'
        }, { transaction: t });
        batchMap[b.filename] = createdBatch.id;
      }
    }

    let updatedCount = 0;
    const updatedPublicationIds = [];
    const validPeriodRegex = /^([<>≤≥]\s*)?(19\d{2}|20\d{2})$/;

    for (const update of confirmedUpdates) {
      if (!update.publicationId) continue;

      const pub = await Publication.findByPk(update.publicationId, { transaction: t });
      if (!pub) {
        continue;
      }

      const previousTotal = (pub.citationCount !== null && pub.citationCount !== undefined) ? pub.citationCount : null;
      const batchId = (update.sourceFile && batchMap[update.sourceFile]) ? batchMap[update.sourceFile] : null;

      // Absolute Count Rule (Part E Section 15):
      // Each upload provides the latest absolute citation count per year (NOT an incremental delta to be added).
      // Retrieve the latest existing snapshot to preserve omitted years and record previous values.
      const prevSnapshot = await PublicationCitationSnapshot.findOne({
        where: { publicationId: pub.id },
        include: [{ model: CitationYearlyDetail, as: 'yearlyDetails' }],
        order: [['createdAt', 'DESC']],
        transaction: t
      });

      const mergedPeriodMap = new Map();

      // Step A: Preserve omitted years from the previous snapshot
      if (prevSnapshot && Array.isArray(prevSnapshot.yearlyDetails)) {
        for (const yd of prevSnapshot.yearlyDetails) {
          const p = String(yd.period || '').trim();
          if (p) {
            mergedPeriodMap.set(p, {
              period: p,
              citationCount: yd.citationCount,
              excludingSelfCount: yd.excludingSelfCount,
              periodType: yd.periodType || 'year',
              citationType: yd.citationType || 'all',
              source: 'Uploaded',
              status: yd.status || 'known'
            });
          }
        }
      }

      // Step B: Replace specified years with the latest absolute count
      if (Array.isArray(update.yearlyDetails)) {
        for (const incoming of update.yearlyDetails) {
          const p = String(incoming.period || '').trim();
          if (!p) continue;

          let newCount = null;
          if (incoming.citationCount !== null && incoming.citationCount !== undefined && incoming.citationCount !== '') {
            const parsed = parseInt(incoming.citationCount, 10);
            if (!isNaN(parsed)) {
              newCount = Math.max(0, parsed); // Absolute count replacement!
            }
          }

          let newExclSelf = null;
          if (incoming.excludingSelfCount !== null && incoming.excludingSelfCount !== undefined && incoming.excludingSelfCount !== '') {
            const parsed = parseInt(incoming.excludingSelfCount, 10);
            if (!isNaN(parsed)) {
              newExclSelf = Math.max(0, parsed);
            }
          }

          const existing = mergedPeriodMap.get(p);
          const finalCount = newCount !== null ? newCount : (existing ? existing.citationCount : null);
          const finalExcl = newExclSelf !== null ? newExclSelf : (existing ? existing.excludingSelfCount : null);

          mergedPeriodMap.set(p, {
            period: p,
            citationCount: finalCount,
            excludingSelfCount: finalExcl,
            periodType: incoming.periodType || (existing ? existing.periodType : 'year'),
            citationType: incoming.citationType || (existing ? existing.citationType : 'all'),
            source: 'Uploaded',
            status: finalCount !== null ? 'known' : 'unknown'
          });
        }
      }

      // Step C: Calculate the new absolute total
      const calculatedAnnualSum = Array.from(mergedPeriodMap.values())
        .filter(d => d.periodType !== 'subtotal' && validPeriodRegex.test(d.period))
        .reduce((sum, d) => sum + (d.citationCount || 0), 0);

      const reportedTotal = (update.reportedTotal !== null && update.reportedTotal !== undefined && !isNaN(parseInt(update.reportedTotal, 10)))
        ? parseInt(update.reportedTotal, 10)
        : calculatedAnnualSum;

      // Step D: Record historical snapshot for full auditability
      const snapshot = await PublicationCitationSnapshot.create({
        publicationId: pub.id,
        importBatchId: batchId,
        sourceFile: update.sourceFile || 'Uploaded Citation File',
        employeeId: update.employeeId || 'UNKNOWN',
        facultyName: update.facultyName || null,
        citationSource: 'Uploaded',
        reportedTotal,
        previousTotal,
        reconciliationStatus: update.reconciliationStatus || (calculatedAnnualSum === reportedTotal ? 'reconciled' : 'incomplete'),
        approvalStatus: 'approved'
      }, { transaction: t });

      // Step E: Create CitationYearlyDetail rows
      const detailRows = Array.from(mergedPeriodMap.values()).map(yd => ({
        snapshotId: snapshot.id,
        period: yd.period,
        citationCount: yd.citationCount,
        excludingSelfCount: yd.excludingSelfCount,
        periodType: yd.periodType,
        citationType: yd.citationType,
        source: 'Uploaded',
        status: yd.status
      }));

      if (detailRows.length > 0) {
        await CitationYearlyDetail.bulkCreate(detailRows, { transaction: t });
      }

      // Step F: Update publication citation count with the new absolute total
      pub.citationCount = reportedTotal;
      pub.citationMatchMethod = 'Verified Citation Upload';
      pub.citationStatus = 'reconciled';
      await pub.save({ transaction: t });

      updatedCount++;
      updatedPublicationIds.push(pub.id);
    }

    await t.commit();

    await logActionSafe({
      user: req.user,
      action: 'CONFIRM_CITATION_IMPORT',
      title: 'Confirmed Citation Overview Import',
      remarks: `Updated citation totals and history for ${updatedCount} publications with absolute counts.`,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      updatedCount,
      message: `Successfully confirmed and updated citations for ${updatedCount} publication${updatedCount > 1 ? 's' : ''}.`
    });

  } catch (error) {
    await t.rollback();
    console.error('confirmCitationsUpdate error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to confirm citation updates'
    });
  }
};

/**
 * Retrieves citation overview summary, dynamic year-wise breakdown,
 * and historical snapshots for a specific publication.
 */
exports.getPublicationCitations = async (req, res) => {
  try {
    const { id } = req.params;
    const pub = await Publication.findByPk(id);
    if (!pub) {
      return res.status(404).json({
        success: false,
        message: 'Publication not found.'
      });
    }

    const snapshots = await PublicationCitationSnapshot.findAll({
      where: { publicationId: pub.id },
      include: [
        {
          model: CitationYearlyDetail,
          as: 'yearlyDetails',
          attributes: ['id', 'period', 'citationCount', 'excludingSelfCount', 'periodType', 'citationType', 'source', 'status']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Look up verified faculty contributor
    let verifiedFaculty = null;
    try {
      const pf = await PublicationFaculty.findOne({
        where: { publicationId: pub.id },
        order: [['createdAt', 'ASC']]
      });
      if (pf) {
        verifiedFaculty = {
          id: pf.facultyId,
          employeeId: pf.employeeId,
          name: pf.facultyName,
          department: pf.department
        };
      } else if (pub.createdBy) {
        const fac = await Faculty.findOne({ where: { userId: pub.createdBy } });
        if (fac) {
          verifiedFaculty = {
            id: fac.id,
            employeeId: fac.employeeId,
            name: fac.name,
            department: fac.department
          };
        }
      }
    } catch (facErr) {
      console.warn('[PublicationController] Faculty lookup notice:', facErr.message);
    }

    if (snapshots.length === 0) {
      return res.json({
        success: true,
        publicationId: pub.id,
        currentTotal: pub.citationCount,
        hasHistory: false,
        message: 'Year-wise citation history not available',
        scopusIdentifiers: {
          eid: pub.scopusEid,
          docId: pub.scopusDocId,
          scopusUrl: pub.scopusUrl,
          scopusCitedByUrl: pub.scopusCitedByUrl,
          matchMethod: pub.citationMatchMethod
        },
        verifiedFaculty
      });
    }

    const latest = snapshots[0];
    const validPeriodRegex = /^([<>≤≥]\s*)?(19\d{2}|20\d{2})$/;

    // Find the snapshot that contains verified yearly breakdown (prefer latest, or fall back to any in historical snapshots)
    const snapshotWithDetails = (latest.yearlyDetails && latest.yearlyDetails.length > 0)
      ? latest
      : (snapshots.find(s => s.yearlyDetails && s.yearlyDetails.length > 0) || latest);

    const activeDetails = (latest.yearlyDetails && latest.yearlyDetails.length > 0)
      ? latest.yearlyDetails
      : (snapshotWithDetails?.yearlyDetails || []);

    // Ensure snapshot does not show SCOPUS_API
    const effectiveEmpId = (latest.employeeId && latest.employeeId !== 'SCOPUS_API')
      ? latest.employeeId
      : (verifiedFaculty?.employeeId || 'Institutional Research');
    const effectiveFacultyName = (latest.facultyName && latest.employeeId !== 'SCOPUS_API')
      ? latest.facultyName
      : (verifiedFaculty?.name || null);

    const hasCorruptPeriods = activeDetails.some(yd =>
      yd.periodType !== 'subtotal' && !validPeriodRegex.test(String(yd.period || '').trim())
    );

    const hasValidYearlyBreakdown = activeDetails.some(yd =>
      yd.periodType !== 'subtotal' && validPeriodRegex.test(String(yd.period || '').trim())
    );

    const effectiveReconciliationStatus = hasCorruptPeriods
      ? 'unverified'
      : (latest.reconciliationStatus || snapshotWithDetails?.reconciliationStatus || 'reconciled');

    // Calculate cumulative series and running totals using active verified details
    const sortedYearDetails = activeDetails
      .filter(yd => yd.periodType !== 'subtotal' && validPeriodRegex.test(String(yd.period || '').trim()))
      .sort((a, b) => parseInt(String(a.period).replace(/\D/g, ''), 10) - parseInt(String(b.period).replace(/\D/g, ''), 10));

    let runAll = 0;
    let runExSelf = 0;
    const cumulativeSeries = sortedYearDetails.map(yd => {
      runAll += (yd.citationCount || 0);
      if (yd.excludingSelfCount !== null && yd.excludingSelfCount !== undefined) {
        runExSelf += yd.excludingSelfCount;
      }
      return {
        period: yd.period,
        annualAll: yd.citationCount || 0,
        cumulativeAll: runAll,
        annualExcludingSelf: yd.excludingSelfCount,
        cumulativeExcludingSelf: yd.excludingSelfCount !== null ? runExSelf : null
      };
    });

    const reportedTotal = pub.citationCount ?? latest.reportedTotal ?? 0;
    const derivedAnnualTotal = runAll;
    const discrepancy = reportedTotal - derivedAnnualTotal;

    return res.json({
      success: true,
      publicationId: pub.id,
      currentTotal: reportedTotal,
      hasHistory: true,
      hasValidYearlyBreakdown,
      reconciliation: {
        reportedTotal,
        derivedAnnualTotal,
        discrepancy,
        isReconciled: discrepancy === 0
      },
      scopusIdentifiers: {
        eid: pub.scopusEid,
        docId: pub.scopusDocId,
        scopusUrl: pub.scopusUrl,
        scopusCitedByUrl: pub.scopusCitedByUrl,
        matchMethod: pub.citationMatchMethod
      },
      verifiedFaculty,
      cumulativeSeries,
      latestSnapshot: {
        id: latest.id,
        sourceFile: latest.sourceFile,
        employeeId: effectiveEmpId,
        facultyName: effectiveFacultyName,
        citationSource: latest.citationSource,
        reportedTotal: latest.reportedTotal,
        previousTotal: latest.previousTotal,
        reconciliationStatus: effectiveReconciliationStatus,
        hasCorruptPeriods,
        createdAt: latest.createdAt,
        yearlyDetails: activeDetails
      },
      history: snapshots.map(s => ({
        id: s.id,
        sourceFile: s.sourceFile,
        employeeId: (s.employeeId && s.employeeId !== 'SCOPUS_API') ? s.employeeId : (verifiedFaculty?.employeeId || 'Institutional Research'),
        facultyName: (s.facultyName && s.employeeId !== 'SCOPUS_API') ? s.facultyName : (verifiedFaculty?.name || null),
        citationSource: s.citationSource,
        reportedTotal: s.reportedTotal,
        previousTotal: s.previousTotal,
        difference: (s.previousTotal !== null && s.previousTotal !== undefined) ? (s.reportedTotal - s.previousTotal) : null,
        reconciliationStatus: (s.yearlyDetails || []).some(yd => yd.periodType !== 'subtotal' && !validPeriodRegex.test(String(yd.period || '').trim()))
          ? 'unverified'
          : s.reconciliationStatus,
        createdAt: s.createdAt,
        yearlyDetails: s.yearlyDetails || []
      }))
    });

  } catch (error) {
    console.error('getPublicationCitations error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch publication citations'
    });
  }
};

/**
 * Resolves citation source file buffer and filename from request body (file content)
 * or local storage / fixtures.
 */
function resolveCitationSourceBuffer(snapshot, reqBody) {
  const { content, file, fileContentBase64, filename: customFilename } = reqBody || {};
  const raw = fileContentBase64 || content || file;

  if (raw) {
    let buffer;
    if (typeof raw === 'string' && raw.startsWith('data:')) {
      buffer = Buffer.from(raw.split(',')[1] || '', 'base64');
    } else if (typeof raw === 'string' && !raw.includes('\n') && raw.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(raw)) {
      buffer = Buffer.from(raw, 'base64');
    } else {
      buffer = Buffer.from(String(raw), 'utf-8');
    }
    return {
      buffer,
      filename: customFilename || snapshot?.sourceFile || 'uploaded_citation_source.csv',
      sourceType: 'upload'
    };
  }

  // Look up source files in server fixtures and uploads directories
  const candidates = [
    customFilename,
    snapshot?.sourceFile,
    '3489_Suresh K.csv',
    '3489_Suresh_K.csv'
  ].filter(Boolean);

  const baseDirs = [
    path.join(__dirname, '../fixtures/citations'),
    path.join(__dirname, '../uploads/citations'),
    path.join(process.cwd(), 'src/app/backend/fixtures/citations')
  ];

  for (const dir of baseDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of candidates) {
      const fullPath = path.join(dir, name);
      if (fs.existsSync(fullPath)) {
        try {
          const buffer = fs.readFileSync(fullPath);
          return {
            buffer,
            filename: name,
            sourceType: 'server_fixture',
            path: fullPath
          };
        } catch (e) {
          // continue
        }
      }
    }
  }

  return null;
}

/**
 * Generates an audited preview for citation correction without modifying the database.
 * Accurately matches the target publication against verified source file using
 * Title, ISSN, Publication Year, and Journal Title. Computes difference, proposed
 * breakdown, and validation status.
 */
exports.previewCitationCorrection = async (req, res) => {
  try {
    const { id } = req.params;
    const pub = await Publication.findByPk(id);
    if (!pub) {
      return res.status(404).json({
        success: false,
        message: 'Publication not found.'
      });
    }

    const snapshot = await PublicationCitationSnapshot.findOne({
      where: { publicationId: pub.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: CitationYearlyDetail,
          as: 'yearlyDetails',
          attributes: ['id', 'period', 'citationCount', 'periodType', 'status']
        }
      ]
    });

    const source = resolveCitationSourceBuffer(snapshot, req.body);
    if (!source || !source.buffer) {
      return res.status(400).json({
        success: false,
        code: 'SOURCE_FILE_REQUIRED',
        message: `Original citation source file "${snapshot?.sourceFile || 'EmpID_Name.csv'}" is not stored on server. Please upload the verified Scopus CSV/XLSX file to preview and apply correction.`
      });
    }

    const parsed = parseCitationBuffer(source.buffer, source.filename);
    const matchResult = findMatchingCitationRecord(pub, parsed.records);

    if (matchResult.status === 'Not Found') {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND_IN_SOURCE',
        message: `No matching citation record found for publication "${pub.title}" in file "${source.filename}". Verified match requires matching Title, ISSN (${pub.issn || 'N/A'}), or Publication Year (${pub.publicationYear || 'N/A'}).`
      });
    }

    if (matchResult.status === 'Needs Review' || matchResult.status === 'Ambiguous') {
      return res.status(400).json({
        success: false,
        code: 'AMBIGUOUS_MATCH',
        message: `Multiple candidate rows (${matchResult.candidates.length}) matched publication "${pub.title}". Disambiguation required.`,
        candidates: matchResult.candidates.map(c => ({
          rowIndex: c.rowIndex,
          documentTitle: c.documentTitle,
          issn: c.issn,
          publicationYear: c.publicationYear,
          journalTitle: c.journalTitle,
          reportedTotal: c.reportedTotal
        }))
      });
    }

    const candidate = matchResult.candidate;
    const existingTotal = pub.citationCount;
    const proposedTotal = candidate.reportedTotal;
    const difference = (existingTotal !== null && existingTotal !== undefined)
      ? (proposedTotal - existingTotal)
      : proposedTotal;

    const yearlyDetails = candidate.yearlyDetails || [];
    const annualCitationSum = yearlyDetails
      .filter(d => d.periodType === 'year')
      .reduce((sum, d) => sum + (d.citationCount || 0), 0);
    const groupedPeriodCitations = yearlyDetails
      .filter(d => d.periodType === 'grouped')
      .reduce((sum, d) => sum + (d.citationCount || 0), 0);
    const subtotalEntry = yearlyDetails.find(d => d.periodType === 'subtotal');
    const sourceSubtotal = subtotalEntry ? subtotalEntry.citationCount : annualCitationSum;
    const sourceTotal = candidate.reportedTotal;
    const reconciliationStatus = candidate.reconciliationStatus;

    // Cryptographic verification token preventing tampered submissions
    const verificationPayload = `${pub.id}:${candidate.rowIndex}:${proposedTotal}:${parsed.checksum}`;
    const verificationToken = crypto.createHmac('sha256', process.env.JWT_SECRET || 'iqac-platform-secret-key-christ').update(verificationPayload).digest('hex');

    return res.json({
      success: true,
      preview: {
        publicationId: pub.id,
        publicationTitle: pub.title,
        publicationYear: pub.publicationYear || pub.academicYear || candidate.publicationYear,
        issn: pub.issn || candidate.issn,
        journalTitle: pub.journalName || candidate.journalTitle,
        sourceFile: source.filename,
        sourceRow: candidate.rowIndex,
        existingTotal,
        proposedTotal,
        difference,
        existingBreakdown: snapshot?.yearlyDetails || [],
        proposedBreakdown: yearlyDetails,
        reconciliationStatus,
        annualCitationSum,
        groupedPeriodCitations,
        sourceSubtotal,
        sourceTotal,
        matchMethod: matchResult.matchMethod,
        verificationToken,
        fileChecksum: parsed.checksum,
        fileContentBase64: source.buffer.toString('base64')
      }
    });

  } catch (error) {
    console.error('previewCitationCorrection error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to preview citation correction'
    });
  }
};

/**
 * Applies explicit, audited citation data correction for a publication.
 * Server-side revalidates source record, preserves historical provenance,
 * deletes corrupt periods, inserts verified year-wise details, updates
 * publication citationCount atomically, and logs audit action.
 */
exports.applyAuditedCitationCorrection = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const pub = await Publication.findByPk(id, { transaction: t });
    if (!pub) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Publication not found.'
      });
    }

    let snapshot = await PublicationCitationSnapshot.findOne({
      where: { publicationId: pub.id },
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    // Resolve source buffer from request or server files
    const source = resolveCitationSourceBuffer(snapshot, req.body);
    if (!source || !source.buffer) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'SOURCE_FILE_REQUIRED',
        message: `Original citation source file "${snapshot?.sourceFile || 'EmpID_Name.csv'}" is not stored on server. Please upload the verified Scopus CSV/XLSX file to apply correction.`
      });
    }

    const parsed = parseCitationBuffer(source.buffer, source.filename);
    const matchResult = findMatchingCitationRecord(pub, parsed.records);

    if (matchResult.status !== 'Matched' || !matchResult.candidate) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        code: 'INVALID_SOURCE_RECORD',
        message: `Could not uniquely verify source record for publication "${pub.title}" in file "${source.filename}". Match status: ${matchResult.status}.`
      });
    }

    const candidate = matchResult.candidate;
    const previousTotal = pub.citationCount;
    const verifiedTotal = candidate.reportedTotal;

    // Optional verification token check
    if (req.body.verificationToken) {
      const expectedPayload = `${pub.id}:${candidate.rowIndex}:${verifiedTotal}:${parsed.checksum}`;
      const expectedToken = crypto.createHmac('sha256', process.env.JWT_SECRET || 'iqac-platform-secret-key-christ').update(expectedPayload).digest('hex');
      if (req.body.verificationToken !== expectedToken) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          code: 'STALE_PREVIEW',
          message: 'Correction preview data has expired or is invalid. Please preview the correction again.'
        });
      }
    }

    // 1. Update or create snapshot
    if (snapshot) {
      // Delete old / corrupt yearly details
      await CitationYearlyDetail.destroy({
        where: { snapshotId: snapshot.id },
        transaction: t
      });

      snapshot.previousTotal = previousTotal;
      snapshot.reportedTotal = verifiedTotal;
      snapshot.reconciliationStatus = candidate.reconciliationStatus;
      snapshot.sourceFile = source.filename;
      await snapshot.save({ transaction: t });
    } else {
      snapshot = await PublicationCitationSnapshot.create({
        publicationId: pub.id,
        sourceFile: source.filename,
        employeeId: candidate.employeeId || extractEmployeeIdFromFilename(source.filename) || 'UNKNOWN',
        facultyName: candidate.facultyName || null,
        citationSource: 'Scopus',
        reportedTotal: verifiedTotal,
        previousTotal: previousTotal,
        reconciliationStatus: candidate.reconciliationStatus
      }, { transaction: t });
    }

    // 2. Insert verified yearly details from matched source row
    const verifiedDetails = candidate.yearlyDetails.map(yd => ({
      snapshotId: snapshot.id,
      period: yd.period,
      citationCount: yd.citationCount,
      periodType: yd.periodType,
      status: yd.status
    }));

    await CitationYearlyDetail.bulkCreate(verifiedDetails, { transaction: t });

    // 3. Update publication current approved total
    pub.citationCount = verifiedTotal;
    await pub.save({ transaction: t });

    await t.commit();

    // 4. Log audit action
    await logActionSafe({
      user: req.user,
      action: 'AUDITED_CITATION_CORRECTION',
      title: `Applied Audited Citation Correction for "${pub.title}"`,
      remarks: `Corrected citation total from ${previousTotal} to ${verifiedTotal} using verified source ${source.filename} row ${candidate.rowIndex} (${matchResult.matchMethod}).`,
      ipAddress: req.ip
    });

    return res.json({
      success: true,
      message: `Audited correction applied: citation total corrected from ${previousTotal} to ${verifiedTotal} using verified Scopus source (Row ${candidate.rowIndex}).`,
      publicationId: pub.id,
      currentTotal: verifiedTotal,
      latestSnapshot: {
        id: snapshot.id,
        sourceFile: snapshot.sourceFile,
        employeeId: snapshot.employeeId,
        facultyName: snapshot.facultyName,
        citationSource: snapshot.citationSource,
        reportedTotal: verifiedTotal,
        previousTotal,
        reconciliationStatus: candidate.reconciliationStatus,
        hasCorruptPeriods: false,
        yearlyDetails: verifiedDetails
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('applyAuditedCitationCorrection error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to apply citation correction'
    });
  }
};

/**
 * Manually trigger a Scopus citation refresh sweep for eligible/due publications (Admin / Coordinator).
 * @route POST /api/publications/citations/refresh-all
 */
exports.refreshAllCitations = async (req, res) => {
  try {
    const { executeCitationRefreshSweep } = require('../services/citationRefreshScheduler');
    const result = await executeCitationRefreshSweep(50);
    res.json({
      success: true,
      message: 'Scopus citation refresh sweep completed.',
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Manually refresh citations from Scopus for a single publication.
 * @route POST /api/publications/:id/refresh-citation
 */
exports.refreshSingleCitation = async (req, res) => {
  try {
    const { retrievePublicationCitations } = require('../services/scopusService');
    const enriched = await retrievePublicationCitations(req.params.id);
    if (!enriched) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }
    res.json({
      success: true,
      message: `Scopus citation status: ${enriched.citationStatus}. Total citations: ${enriched.citationCount ?? 'N/A'}.`,
      data: enriched
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Scopus API & weekly scheduler integration diagnostics (Admin).
 * @route GET /api/publications/citations/diagnostics
 */
exports.getCitationDiagnostics = async (req, res) => {
  try {
    const { getScopusDiagnosticStatus } = require('../services/scopusService');
    const { getSchedulerStatus } = require('../services/citationRefreshScheduler');
    const diag = await getScopusDiagnosticStatus();
    const sched = getSchedulerStatus();
    res.json({
      success: true,
      diagnostics: diag,
      scheduler: sched
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Retrieves comprehensive Journal-Level metrics (CiteScores, SJR, SNIP, scholarly output).
 * @route GET /api/publications/:id/journal-metrics
 */
exports.getPublicationJournalMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const pub = await Publication.findByPk(id);
    if (!pub) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }

    const { retrieveJournalMetrics } = require('../services/scopusService');
    const metrics = await retrieveJournalMetrics({
      scopusSourceId: pub.scopusSourceId,
      issn: pub.issn,
      journalTitle: pub.journalName
    });

    return res.json({
      success: true,
      publicationId: pub.id,
      journalName: pub.journalName,
      issn: pub.issn,
      metrics
    });
  } catch (error) {
    console.error('getPublicationJournalMetrics error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch journal metrics.' });
  }
};

/**
 * Manually refresh journal metrics from Elsevier Serial Title API for a publication's journal.
 * @route POST /api/publications/:id/refresh-journal-metrics
 */
exports.refreshPublicationJournalMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const pub = await Publication.findByPk(id);
    if (!pub) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }

    const { retrieveJournalMetrics } = require('../services/scopusService');
    const metrics = await retrieveJournalMetrics({
      scopusSourceId: pub.scopusSourceId,
      issn: pub.issn,
      journalTitle: pub.journalName
    });

    if (metrics.success && metrics.scopusSourceId && !pub.scopusSourceId) {
      pub.scopusSourceId = metrics.scopusSourceId;
      await pub.save();
    }

    return res.json({
      success: true,
      message: `Journal metrics refreshed for "${metrics.sourceTitle || pub.journalName}".`,
      publicationId: pub.id,
      journalName: pub.journalName,
      metrics
    });
  } catch (error) {
    console.error('refreshPublicationJournalMetrics error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to refresh journal metrics.' });
  }
};

/**
 * Administrator / Coordinator batch refresh for all unique journal sources.
 * @route POST /api/publications/journal-sources/refresh-all
 */
exports.refreshAllJournalMetrics = async (req, res) => {
  try {
    const { refreshDueJournalMetrics } = require('../services/scopusService');
    const batchLimit = parseInt(req.body?.limit || req.query?.limit || 25, 10);
    const result = await refreshDueJournalMetrics({ forceAll: true, batchLimit });
    return res.json({
      success: true,
      message: `Refreshed ${result.refreshedCount || 0} journal sources.`,
      result
    });
  } catch (error) {
    console.error('refreshAllJournalMetrics error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to refresh journal metrics.' });
  }
};

/**
 * Searches Serial Title candidates using Journal Title or ISSN.
 * @route GET /api/publications/journal-sources/search
 */
exports.searchJournals = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !String(q).trim()) {
      return res.json({ success: true, candidates: [] });
    }
    const { searchJournalCandidates } = require('../services/scopusService');
    const candidates = await searchJournalCandidates(q);
    return res.json({ success: true, candidates });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Manually links a verified ScopusSource candidate to a publication.
 * @route POST /api/publications/:id/link-journal-source
 */
exports.linkPublicationJournal = async (req, res) => {
  try {
    const { id } = req.params;
    const { scopusSourceId, sourceTitle, issn } = req.body;
    const pub = await Publication.findByPk(id);
    if (!pub) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }
    if (scopusSourceId) pub.scopusSourceId = scopusSourceId;
    if (issn && !pub.issn) pub.issn = issn;
    await pub.save();

    const { retrieveJournalMetrics } = require('../services/scopusService');
    const metrics = await retrieveJournalMetrics({
      scopusSourceId: pub.scopusSourceId,
      issn: pub.issn,
      journalTitle: sourceTitle || pub.journalName
    });

    return res.json({
      success: true,
      message: 'Journal source linked successfully.',
      publication: pub,
      metrics
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Exports comprehensive publication citation and journal metrics dossier in Excel or JSON.
 * @route GET /api/publications/:id/export
 */
exports.exportPublicationReport = async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { id } = req.params;
    const { format = 'excel' } = req.query;
    const pub = await Publication.findByPk(id, {
      include: [
        { model: PublicationFaculty, as: 'facultyAssociations' },
        {
          model: PublicationCitationSnapshot,
          as: 'citationSnapshots',
          include: [{ model: CitationYearlyDetail, as: 'yearlyDetails' }],
          order: [['createdAt', 'DESC']]
        }
      ]
    });
    if (!pub) {
      return res.status(404).json({ success: false, message: 'Publication not found.' });
    }

    const { retrieveJournalMetrics } = require('../services/scopusService');
    const journalData = await retrieveJournalMetrics({
      scopusSourceId: pub.scopusSourceId,
      issn: pub.issn,
      journalTitle: pub.journalName
    });

    if (format === 'json') {
      return res.json({ success: true, publication: pub, journalMetrics: journalData });
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Publication Information
    const sheet1Data = [
      { Field: 'Publication Title', Value: pub.title },
      { Field: 'DOI', Value: pub.doi || 'N/A' },
      { Field: 'Authors', Value: pub.authorName },
      { Field: 'Journal / Source', Value: pub.journalName },
      { Field: 'Publication Year', Value: pub.publicationYear || pub.academicYear || 'N/A' },
      { Field: 'Scopus EID', Value: pub.scopusEid || 'N/A' },
      { Field: 'Department', Value: pub.department || 'N/A' },
      { Field: 'Journal Type', Value: pub.journalType || 'Scopus' },
      { Field: 'Quartile', Value: pub.quartile || 'N/A' },
      { Field: 'CiteScore', Value: pub.citeScoreValue || 'N/A' },
      { Field: 'Scopus Record Link', Value: pub.scopusUrl || 'N/A' }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1Data), 'Publication Info');

    // Sheet 2: Citation Summary
    const latestSnapshot = pub.citationSnapshots?.[0];
    const sheet2Data = [
      { Metric: 'Total Scopus Citations', Value: pub.citationCount ?? 'N/A' },
      { Metric: 'Citation Status', Value: pub.citationStatus || 'N/A' },
      { Metric: 'Match Method', Value: pub.citationMatchMethod || 'DOI' },
      { Metric: 'Last Scopus Refresh', Value: pub.lastCitationRefreshAt ? new Date(pub.lastCitationRefreshAt).toISOString() : 'N/A' },
      { Metric: 'Verified Contributor', Value: latestSnapshot?.facultyName ? `${latestSnapshot.facultyName} (${latestSnapshot.employeeId})` : 'N/A' },
      { Metric: 'Reconciliation Status', Value: latestSnapshot?.reconciliationStatus || 'reconciled' }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2Data), 'Citation Summary');

    // Sheet 3: Annual Citation Data
    const yearlyRows = (latestSnapshot?.yearlyDetails || []).map(yd => ({
      'Citation Year': yd.period,
      'All Citations': yd.citationCount ?? 'N/A',
      'Excluding Self-Citations': yd.excludingSelfCount ?? 'N/A',
      'Data Availability': yd.status || 'known',
      'Source': yd.source || 'Scopus'
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(yearlyRows.length > 0 ? yearlyRows : [{ Notice: 'No annual breakdown records available for this publication' }]), 'Annual Citations');

    // Sheet 4: Citation Snapshots
    const snapshotRows = (pub.citationSnapshots || []).map(s => ({
      'Snapshot Date': new Date(s.createdAt).toISOString().split('T')[0],
      'Reported Total': s.reportedTotal,
      'Previous Total': s.previousTotal ?? 'N/A',
      'Faculty Member': s.facultyName ? `${s.facultyName} (${s.employeeId})` : (s.employeeId || 'N/A'),
      'Source File / Channel': s.sourceFile,
      'Reconciliation': s.reconciliationStatus,
      'Approval Status': s.approvalStatus
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(snapshotRows.length > 0 ? snapshotRows : [{ Notice: 'No snapshots recorded' }]), 'Citation Snapshots');

    // Sheet 5: Journal Information
    const sheet5Data = [
      { Field: 'Journal Title', Value: journalData.sourceTitle || pub.journalName },
      { Field: 'Scopus Source ID', Value: journalData.scopusSourceId || pub.scopusSourceId || 'N/A' },
      { Field: 'ISSN', Value: journalData.issn || pub.issn || 'N/A' },
      { Field: 'E-ISSN', Value: journalData.eIssn || 'N/A' },
      { Field: 'Publisher', Value: journalData.publisher || pub.publisher || 'N/A' },
      { Field: 'Source Type', Value: journalData.sourceType || 'Journal' },
      { Field: 'Current CiteScore', Value: journalData.currentCiteScore?.value ?? 'N/A' },
      { Field: 'Current Metric Year', Value: journalData.currentCiteScore?.year ?? 'N/A' },
      { Field: 'CiteScore Tracker', Value: journalData.trackerCiteScore?.value ?? 'N/A' },
      { Field: 'Tracker Year', Value: journalData.trackerCiteScore?.year ?? 'N/A' },
      { Field: 'Best Quartile', Value: journalData.currentCiteScore?.bestQuartile || pub.quartile || 'N/A' },
      { Field: 'Scopus Source URL', Value: journalData.scopusUrl || 'N/A' }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet5Data), 'Journal Info');

    // Sheet 6: Journal Metrics
    const metricRows = [];
    const csYears = journalData.citeScoresByYear || {};
    Object.keys(csYears).sort((a, b) => b - a).forEach(yr => {
      const info = csYears[yr];
      metricRows.push({
        'Metric': info.status === 'In-Progress' ? 'CiteScore Tracker' : 'CiteScore',
        'Metric Year': yr,
        'Value': info.citeScore,
        'Status': info.status,
        'Scholarly Output': journalData.scholarlyOutputByYear?.[yr] ?? 'N/A',
        'SJR': journalData.sjrByYear?.[yr] ?? 'N/A',
        'SNIP': journalData.snipByYear?.[yr] ?? 'N/A',
        'Categories / Ranks': (info.categories || []).map(c => `${c.category}: Rank ${c.rank} (${c.percentile}th percentile, ${c.quartile})`).join('; ')
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metricRows.length > 0 ? metricRows : [{ Notice: 'No historical journal metrics available' }]), 'Journal Metrics');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const safeTitle = (pub.title || 'Publication_Report').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_Scopus_Dossier.xlsx"`);
    return res.send(buf);

  } catch (err) {
    console.error('exportPublicationReport error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Export internal helpers for unit testing & external validation
exports.extractEmployeeIdFromFilename = extractEmployeeIdFromFilename;
exports.validateBulkFilename = validateBulkFilename;
exports.normalizeDoi = normalizeDoi;
exports.normalizeTitle = normalizeTitle;
exports.normalizePublicationYear = normalizePublicationYear;
exports.sanitizeCitationCount = sanitizeCitationCount;
exports.sanitizeStringField = sanitizeStringField;
exports.sanitizeUrl = sanitizeUrl;
exports.sanitizeDate = sanitizeDate;
exports.sanitizeAmount = sanitizeAmount;
exports.calculateTitleSimilarity = calculateTitleSimilarity;
exports.findMatchingCitationRecord = findMatchingCitationRecord;
