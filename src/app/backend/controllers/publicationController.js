const { Publication, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../middleware/auditLogger');
const { sendNotification } = require('../middleware/notificationHelper');

const sanitizeDate = (val) => {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (['n/a', 'na', 'nil', 'null', '-', '--', 'pending', 'none', 'tbd'].includes(lower)) return null;
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
      search
    } = req.query;

    const where = {};
    const selectedYear = academicYear || year;

    if (journalType && journalType !== 'all') {
      where.journalType = {
        [Op.iLike]: `%${journalType.trim()}%`
      };
    }

    if (selectedYear && selectedYear !== 'all') {
      where.academicYear = selectedYear;
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
      where[Op.or] = [
        { authorName: { [Op.iLike]: q } },
        { title: { [Op.iLike]: q } },
        { journalName: { [Op.iLike]: q } },
        { journalType: { [Op.iLike]: q } },
        { doi: { [Op.iLike]: q } },
        { issn: { [Op.iLike]: q } },
        { department: { [Op.iLike]: q } }
      ];
    }

    const publications = await Publication.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }],
      order: [
        ['academicYear', 'DESC'],
        ['publicationDate', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json({
      success: true,
      count: publications.length,
      data: publications
    });
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

    if (year && year !== 'all') where.academicYear = year;
    if (department && department !== 'all') {
      where.department = { [Op.iLike]: `%${department}%` };
    }

    const allPubs = await Publication.findAll({ where });

    let scopusCount = 0;
    let wosCount = 0;
    let bothCount = 0;
    let otherCount = 0;
    let totalCitations = 0;

    const departmentBreakdown = {};
    const yearBreakdown = {};

    allPubs.forEach(p => {
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

      totalCitations += Number(p.citationCount) || 0;

      // Dept count
      const dept = p.department || 'Unassigned';
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;

      // Year count
      const y = p.academicYear || 'Unknown';
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
        yearBreakdown
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

// @desc    Get single publication by ID
// @route   GET /api/publications/:id
// @access  Private
exports.getPublication = async (req, res) => {
  try {
    const publication = await Publication.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }]
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
      title,
      journalName,
      journalType,
      department,
      academicYear,
      publicationDate,
      doi,
      issn,
      volume,
      issue,
      pageNumber,
      impactFactor,
      citationCount,
      paperUrl,
      abstract,
      status
    } = req.body;

    // Validation for required fields
    if (!authorName || !title || !journalName || !journalType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Author Name, Title, Journal Name, and Journal Type.'
      });
    }

    const assignedDept = department || req.user.department || 'General';
    const assignedYear = academicYear || '2024-2025';

    const publication = await Publication.create({
      authorName: authorName.trim(),
      title: title.trim(),
      journalName: journalName.trim(),
      journalType: journalType.trim(),
      department: assignedDept.trim(),
      academicYear: assignedYear.trim(),
      publicationDate: publicationDate || null,
      doi: doi ? doi.trim() : null,
      issn: issn ? issn.trim() : null,
      volume: volume ? String(volume).trim() : null,
      issue: issue ? String(issue).trim() : null,
      pageNumber: pageNumber ? String(pageNumber).trim() : null,
      impactFactor: impactFactor ? parseFloat(impactFactor) : null,
      citationCount: citationCount ? parseInt(citationCount, 10) : 0,
      paperUrl: paperUrl ? paperUrl.trim() : null,
      abstract: abstract ? abstract.trim() : null,
      status: status || (req.user.role === 'admin' ? 'approved' : 'submitted'),
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

    const oldValues = publication.toJSON();

    const allowedFields = [
      'authorName', 'title', 'journalName', 'journalType', 'department',
      'academicYear', 'publicationDate', 'doi', 'issn', 'volume', 'issue',
      'pageNumber', 'impactFactor', 'citationCount', 'paperUrl', 'abstract', 'status'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        publication[field] = req.body[field];
      }
    });

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

// @desc    Bulk Upload Publications (from parsed CSV / Excel)
// @route   POST /api/publications/bulk
// @access  Private (Admin, HOD, Coordinator, Faculty)
exports.bulkUploadPublications = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, defaultDepartment, defaultYear } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No publication items provided for bulk upload.'
      });
    }

    const validRecords = [];
    const errors = [];

    items.forEach((item, index) => {
      const rowNum = index + 1;
      const authorName = item.authorName || item['Author Name'] || item['Authors'] || item['Author'] || '';
      const title = item.title || item['Title'] || item['Publication Title'] || item['Paper Title'] || '';
      const journalName = item.journalName || item['Journal Name'] || item['Journal'] || item['Publisher'] || '';
      const journalType = item.journalType || item['Journal Type'] || item['Indexing'] || item['Type'] || 'Scopus';
      const academicYear = item.academicYear || item['Academic Year'] || item['Year'] || defaultYear || '2024-2025';
      const department = item.department || item['Department'] || defaultDepartment || req.user.department || 'General';
      const publicationDate = item.publicationDate || item['Publication Date'] || item['Date'] || null;
      const doi = item.doi || item['DOI'] || item['DOI Number'] || '';
      const issn = item.issn || item['ISSN'] || item['ISBN'] || '';
      const volume = item.volume || item['Volume'] || '';
      const issue = item.issue || item['Issue'] || '';
      const pageNumber = item.pageNumber || item['Page Number'] || item['Pages'] || '';
      const impactFactor = item.impactFactor || item['Impact Factor'] || null;
      const citationCount = item.citationCount || item['Citations'] || 0;
      const paperUrl = item.paperUrl || item['URL'] || item['Paper Link'] || '';
      const abstract = item.abstract || item['Abstract'] || '';

      if (!authorName.trim()) {
        errors.push(`Row ${rowNum}: Author Name is required.`);
        return;
      }
      if (!title.trim()) {
        errors.push(`Row ${rowNum}: Publication Title is required.`);
        return;
      }
      if (!journalName.trim()) {
        errors.push(`Row ${rowNum}: Journal Name is required.`);
        return;
      }

      // Normalize journalType to standard casing
      let normalizedType = journalType.trim();
      const lowerType = normalizedType.toLowerCase();
      if (lowerType.includes('scopus') && (lowerType.includes('wos') || lowerType.includes('web of science'))) {
        normalizedType = 'Scopus & WoS';
      } else if (lowerType.includes('scopus')) {
        normalizedType = 'Scopus';
      } else if (lowerType.includes('wos') || lowerType.includes('web of science')) {
        normalizedType = 'WoS (Web of Science)';
      }

      validRecords.push({
        authorName: authorName.trim(),
        title: title.trim(),
        journalName: journalName.trim(),
        journalType: normalizedType,
        department: department.trim(),
        academicYear: academicYear.trim(),
        publicationDate: sanitizeDate(publicationDate),
        doi: doi ? doi.trim() : null,
        issn: issn ? issn.trim() : null,
        volume: volume ? String(volume).trim() : null,
        issue: issue ? String(issue).trim() : null,
        pageNumber: pageNumber ? String(pageNumber).trim() : null,
        impactFactor: sanitizeAmount(impactFactor),
        citationCount: citationCount ? parseInt(String(citationCount).replace(/[^0-9]/g, ''), 10) || 0 : 0,
        paperUrl: paperUrl ? paperUrl.trim() : null,
        abstract: abstract ? abstract.trim() : null,
        status: req.user?.role === 'admin' ? 'approved' : 'submitted',
        createdBy: req.user?.id
      });
    });

    if (validRecords.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No valid publication records found to insert.',
        errors
      });
    }

    const created = await Publication.bulkCreate(validRecords, {
      transaction: t,
      returning: true
    });

    await t.commit();

    // Audit log
    await logAction(
      req.user.id,
      'BULK_UPLOAD_PUBLICATIONS',
      'Publication',
      null,
      null,
      { count: created.length, errorsCount: errors.length },
      req
    );

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${created.length} publication records.`,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined,
      data: created
    });
  } catch (error) {
    await t.rollback();
    console.error('Bulk upload publications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload for publications.',
      error: error.message
    });
  }
};

// @desc    Clear all publications (Admin only or Dept HOD)
// @route   DELETE /api/publications/clear-all
// @access  Private (Admin / HOD)
exports.clearAllPublications = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'hod' && req.user.department) {
      where.department = req.user.department;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only Administrators and HODs can clear publication records.'
      });
    }

    const count = await Publication.destroy({ where });

    await logAction(
      req.user.id,
      'CLEAR_ALL_PUBLICATIONS',
      'Publication',
      null,
      null,
      { clearedCount: count, scope: where },
      req
    );

    res.json({
      success: true,
      message: `Cleared ${count} publication records successfully.`
    });
  } catch (error) {
    console.error('Clear publications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear publications',
      error: error.message
    });
  }
};
