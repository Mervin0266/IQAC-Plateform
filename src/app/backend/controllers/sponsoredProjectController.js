'use strict';

const {
  SponsoredProject,
  SponsoredResearchDocument,
  SponsoredResearchInstallment,
  User
} = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logActionSafe } = require('../middleware/auditLogger');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { parsePagination, formatPaginationResponse } = require('../utils/paginationHelper');
const googleDriveService = require('../services/googleDriveService');
const { calculateProjectDuration, deriveAndValidateSanctionYear } = require('../utils/projectDurationHelper');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Allowed status options and display-label aliases
const VALID_STATUSES = ['Ongoing', 'Completed', 'Sanctioned', 'Proposal Submitted', 'Terminated'];
const STATUS_ALIASES = {
  'ongoing': 'Ongoing',
  'ongoing research': 'Ongoing',
  'on going': 'Ongoing',
  'in progress': 'Ongoing',
  'active': 'Ongoing',
  'completed': 'Completed',
  'finished': 'Completed',
  'closed': 'Completed',
  'sanctioned': 'Sanctioned',
  'sanctioned / awaiting funds': 'Sanctioned',
  'awaiting funds': 'Sanctioned',
  'approved': 'Sanctioned',
  'proposal submitted': 'Proposal Submitted',
  'proposal submitted / under review': 'Proposal Submitted',
  'under review': 'Proposal Submitted',
  'submitted': 'Proposal Submitted',
  'proposal': 'Proposal Submitted',
  'terminated': 'Terminated',
  'terminated / closed': 'Terminated',
  'cancelled': 'Terminated',
  'discontinued': 'Terminated'
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per document
const MAX_DOCUMENTS_PER_CATEGORY = 10;

/**
 * Format project with hybrid financial reconciliation and duration
 */
function formatProjectWithFinancials(projectInstance) {
  const p = projectInstance.toJSON ? projectInstance.toJSON() : projectInstance;

  const sanctionedAmount = parseFloat(p.sanctionedAmount) || 0;
  const reportedReceived = p.amountReceived !== null && p.amountReceived !== undefined ? parseFloat(p.amountReceived) : null;
  const installments = Array.isArray(p.installments) ? p.installments : [];
  const installmentTotal = installments.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);

  let effectiveAmountReceived = 0;
  let reconciliationStatus = 'none';
  let reconciliationDiff = 0;

  if (reportedReceived !== null && installments.length === 0) {
    // Case 1: Manual aggregate only
    effectiveAmountReceived = reportedReceived;
    reconciliationStatus = 'manual_only';
  } else if (reportedReceived === null && installments.length > 0) {
    // Case 2: Installments only
    effectiveAmountReceived = installmentTotal;
    reconciliationStatus = 'installments_only';
  } else if (reportedReceived !== null && installments.length > 0) {
    // Case 3: Both entered
    const diff = Math.abs(reportedReceived - installmentTotal);
    effectiveAmountReceived = reportedReceived;
    reconciliationDiff = diff;
    reconciliationStatus = diff < 0.01 ? 'matched' : 'mismatched';
  } else {
    effectiveAmountReceived = 0;
    reconciliationStatus = 'none';
  }

  const balanceYetToBeReceived = Math.max(0, sanctionedAmount - effectiveAmountReceived);
  const duration = calculateProjectDuration(p.startDate, p.endDate);

  const docs = Array.isArray(p.documents) ? p.documents : [];
  const agreementLetters = docs.filter(d => d.documentCategory === 'agreement_letter' && d.isActive !== false);
  const paymentReceipts = docs.filter(d => d.documentCategory === 'payment_receipt' && d.isActive !== false);

  return {
    ...p,
    sanctionedAmount,
    amountReceived: reportedReceived,
    effectiveAmountReceived,
    installmentTotal,
    balanceYetToBeReceived,
    reconciliationStatus,
    reconciliationDiff,
    durationFormatted: duration.formatted,
    durationDetails: duration,
    agreementLetters,
    paymentReceipts,
    agreementLetterCount: agreementLetters.length,
    paymentReceiptCount: paymentReceipts.length
  };
}

/**
 * Helper to check role authorization on a project
 */
function checkProjectAccess(project, user, action = 'view') {
  if (!user) return { allowed: false, message: 'Authentication required' };
  if (['admin', 'authority'].includes(user.role)) return { allowed: true };

  const userDept = user.department;
  const isDeptMatch = userDept && (userDept === 'All' || project.department?.toLowerCase() === userDept.toLowerCase());

  if (['coordinator', 'hod'].includes(user.role)) {
    if (isDeptMatch) return { allowed: true };
    return { allowed: false, message: 'Access denied: Project is outside your department scope' };
  }

  if (user.role === 'faculty') {
    if (action === 'view') {
      if (isDeptMatch || project.createdBy === user.id) return { allowed: true };
      return { allowed: false, message: 'Access denied: Viewing restricted to your department or created projects' };
    }
    if (project.createdBy === user.id) return { allowed: true };
    return { allowed: false, message: 'Access denied: You can only edit or manage projects you created' };
  }

  return { allowed: false, message: 'Unauthorized role' };
}

// @desc    Get all sponsored research projects with filtering, searching, role isolation, and attachments
// @route   GET /api/sponsored-projects
// @access  Private
exports.getSponsoredProjects = async (req, res) => {
  try {
    const {
      status,
      agencyType,
      sanctionYear,
      academicYear,
      year,
      department,
      fundingAgency,
      search
    } = req.query;

    const where = {};
    const selectedYear = sanctionYear || academicYear || year;

    if (status && status !== 'all') {
      where.status = {
        [Op.iLike]: `%${status.trim()}%`
      };
    }

    if (agencyType && agencyType !== 'all') {
      where.agencyType = {
        [Op.iLike]: `%${agencyType.trim()}%`
      };
    }

    if (fundingAgency && fundingAgency !== 'all') {
      where.fundingAgency = {
        [Op.iLike]: `%${fundingAgency.trim()}%`
      };
    }

    // Filter by 4-digit sanction year or historical academic year
    if (selectedYear && selectedYear !== 'all') {
      const parsedYear = parseInt(selectedYear, 10);
      if (!isNaN(parsedYear) && String(selectedYear).trim().length === 4) {
        where[Op.or] = [
          { sanctionYear: parsedYear },
          { academicYear: { [Op.iLike]: `%${selectedYear}%` } }
        ];
      } else {
        where.academicYear = selectedYear;
      }
    }

    // Role-based data isolation
    if (req.user) {
      if (['coordinator', 'hod'].includes(req.user.role)) {
        if (req.user.department && req.user.department !== 'All') {
          where.department = {
            [Op.iLike]: `%${req.user.department}%`
          };
        }
      } else if (req.user.role === 'authority') {
        where.approvalStatus = 'approved';
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
        { principalInvestigator: { [Op.iLike]: q } },
        { coInvestigators: { [Op.iLike]: q } },
        { fundingAgency: { [Op.iLike]: q } },
        { scheme: { [Op.iLike]: q } },
        { sanctionOrderNo: { [Op.iLike]: q } },
        { department: { [Op.iLike]: q } },
        { agencyType: { [Op.iLike]: q } }
      ];
    }

    const { page, limit, offset, isExport } = parsePagination(req.query);

    const { count, rows: rawProjects } = await SponsoredProject.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'department'],
          required: false
        },
        {
          model: SponsoredResearchDocument,
          as: 'documents',
          where: { isActive: true },
          required: false
        },
        {
          model: SponsoredResearchInstallment,
          as: 'installments',
          required: false
        }
      ],
      order: [
        ['sanctionYear', 'DESC NULLS LAST'],
        ['sanctionDate', 'DESC NULLS LAST'],
        ['academicYear', 'DESC'],
        ['id', 'ASC']
      ],
      limit: isExport ? undefined : limit,
      offset: isExport ? undefined : offset,
      distinct: true
    });

    const formattedProjects = rawProjects.map(formatProjectWithFinancials);

    res.json(formatPaginationResponse({
      count,
      rows: formattedProjects,
      page,
      limit
    }));
  } catch (error) {
    console.error('Get sponsored projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sponsored projects',
      error: error.message
    });
  }
};

// @desc    Get aggregate statistics for Sponsored Research KPI cards
// @route   GET /api/sponsored-projects/stats
// @access  Private
exports.getSponsoredProjectStats = async (req, res) => {
  try {
    const { department, sanctionYear, academicYear, year } = req.query;
    const where = {};
    const selectedYear = sanctionYear || academicYear || year;

    if (selectedYear && selectedYear !== 'all') {
      const parsedYear = parseInt(selectedYear, 10);
      if (!isNaN(parsedYear) && String(selectedYear).trim().length === 4) {
        where[Op.or] = [
          { sanctionYear: parsedYear },
          { academicYear: { [Op.iLike]: `%${selectedYear}%` } }
        ];
      } else {
        where.academicYear = selectedYear;
      }
    }

    if (department && department !== 'all') {
      where.department = {
        [Op.iLike]: `%${department.replace(/-/g, '%')}%`
      };
    }

    if (req.user && ['coordinator', 'hod'].includes(req.user.role)) {
      if (req.user.department && req.user.department !== 'All') {
        where.department = {
          [Op.iLike]: `%${req.user.department}%`
        };
      }
    }

    const allProjects = await SponsoredProject.findAll({
      where,
      include: [
        {
          model: SponsoredResearchInstallment,
          as: 'installments',
          required: false
        }
      ]
    });

    let totalSanctionedAmount = 0;
    let totalFundsReceived = 0;
    let ongoingCount = 0;
    let completedCount = 0;
    let sanctionedCount = 0;
    let proposalCount = 0;
    let terminatedCount = 0;

    const byAgencyType = {
      government: 0,
      international: 0,
      industry: 0,
      seedMoney: 0,
      other: 0
    };

    allProjects.forEach(p => {
      const sAmt = parseFloat(p.sanctionedAmount) || 0;
      const reported = p.amountReceived !== null && p.amountReceived !== undefined ? parseFloat(p.amountReceived) : null;
      const instTotal = (p.installments || []).reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
      const effectiveRec = reported !== null ? reported : instTotal;

      totalSanctionedAmount += sAmt;
      totalFundsReceived += effectiveRec;

      const st = (p.status || '').toLowerCase().trim();
      if (st.includes('ongoing')) ongoingCount++;
      else if (st.includes('completed')) completedCount++;
      else if (st.includes('sanction')) sanctionedCount++;
      else if (st.includes('proposal') || st.includes('submit')) proposalCount++;
      else if (st.includes('terminate')) terminatedCount++;
      else ongoingCount++;

      const at = (p.agencyType || '').toLowerCase();
      if (at.includes('government') || at.includes('national') || at.includes('state')) byAgencyType.government++;
      else if (at.includes('international')) byAgencyType.international++;
      else if (at.includes('industry') || at.includes('corporate')) byAgencyType.industry++;
      else if (at.includes('seed') || at.includes('internal')) byAgencyType.seedMoney++;
      else byAgencyType.other++;
    });

    const totalBalanceReceivable = Math.max(0, totalSanctionedAmount - totalFundsReceived);

    res.json({
      success: true,
      stats: {
        totalProjects: allProjects.length,
        totalSanctionedAmount,
        totalFundsReceived,
        totalBalanceReceivable,
        ongoingCount,
        completedCount,
        sanctionedCount,
        proposalCount,
        terminatedCount,
        byAgencyType
      }
    });
  } catch (error) {
    console.error('Get sponsored project stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate sponsored research metrics',
      error: error.message
    });
  }
};

// @desc    Get single sponsored project details with full documents and installments
// @route   GET /api/sponsored-projects/:id
// @access  Private
exports.getSponsoredProject = async (req, res) => {
  try {
    const project = await SponsoredProject.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'department'],
          required: false
        },
        {
          model: SponsoredResearchDocument,
          as: 'documents',
          where: { isActive: true },
          required: false
        },
        {
          model: SponsoredResearchInstallment,
          as: 'installments',
          required: false
        }
      ],
      order: [
        [{ model: SponsoredResearchInstallment, as: 'installments' }, 'paymentDate', 'ASC']
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Sponsored project not found'
      });
    }

    const access = checkProjectAccess(project, req.user, 'view');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    res.json({
      success: true,
      data: formatProjectWithFinancials(project)
    });
  } catch (error) {
    console.error('Get sponsored project by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project details',
      error: error.message
    });
  }
};

// @desc    Create new sponsored research project
// @route   POST /api/sponsored-projects
// @access  Private (Admin, HOD, Coordinator, Faculty)
exports.createSponsoredProject = async (req, res) => {
  try {
    const {
      title,
      principalInvestigator,
      coInvestigators,
      fundingAgency,
      scheme,
      agencyType,
      sanctionOrderNo,
      sanctionDate,
      sanctionYear: manualSanctionYear,
      startDate,
      endDate,
      sanctionedAmount,
      amountReceived,
      status,
      progressPercentage,
      department,
      projectUrl,
      description,
      approvalStatus
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Project title is required' });
    }
    if (!principalInvestigator || !principalInvestigator.trim()) {
      return res.status(400).json({ success: false, message: 'Principal Investigator (PI) name is required' });
    }
    if (!fundingAgency || !fundingAgency.trim()) {
      return res.status(400).json({ success: false, message: 'Funding Agency name is required' });
    }

    // Validate 5 Statuses
    let normalizedStatus = 'Ongoing';
    if (status) {
      const lowerStatus = String(status).trim().toLowerCase();
      if (STATUS_ALIASES[lowerStatus]) {
        normalizedStatus = STATUS_ALIASES[lowerStatus];
      } else if (VALID_STATUSES.includes(status)) {
        normalizedStatus = status;
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid project status '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}`
        });
      }
    }

    // Validate Project Duration Dates
    if (startDate && endDate) {
      const durationCheck = calculateProjectDuration(startDate, endDate);
      if (!durationCheck.isValid) {
        return res.status(400).json({
          success: false,
          message: durationCheck.error || 'End Date cannot be earlier than Start Date'
        });
      }
    }

    // Derive and validate Sanction Year
    const yearDerivation = deriveAndValidateSanctionYear(sanctionDate, manualSanctionYear);
    if (!yearDerivation.valid) {
      return res.status(400).json({
        success: false,
        message: yearDerivation.error
      });
    }

    const assignedDept = req.user?.role === 'admin'
      ? (department || 'General')
      : (req.user?.department || 'General');

    const finalApproval = (['admin', 'coordinator', 'hod'].includes(req.user?.role) && approvalStatus)
      ? approvalStatus
      : (req.user?.role === 'admin' ? 'approved' : 'submitted');

    // Handle Amount Received: never default missing to sanctionedAmount
    let parsedAmountReceived = null;
    if (amountReceived !== undefined && amountReceived !== null && String(amountReceived).trim() !== '') {
      parsedAmountReceived = parseFloat(String(amountReceived).replace(/[^0-9.]/g, '')) || 0.00;
    }

    const project = await SponsoredProject.create({
      title: title.trim(),
      principalInvestigator: principalInvestigator.trim(),
      coInvestigators: coInvestigators ? coInvestigators.trim() : null,
      fundingAgency: fundingAgency.trim(),
      scheme: scheme ? scheme.trim() : null,
      agencyType: agencyType || 'Government (National)',
      sanctionOrderNo: sanctionOrderNo ? sanctionOrderNo.trim() : null,
      sanctionDate: sanctionDate || null,
      sanctionYear: yearDerivation.sanctionYear,
      academicYear: yearDerivation.academicYear,
      startDate: startDate || null,
      endDate: endDate || null,
      sanctionedAmount: parseFloat(sanctionedAmount) || 0.00,
      amountReceived: parsedAmountReceived,
      status: normalizedStatus,
      progressPercentage: parseInt(progressPercentage, 10) || 0,
      department: assignedDept.trim(),
      projectUrl: projectUrl ? projectUrl.trim() : null,
      description: description ? description.trim() : null,
      approvalStatus: finalApproval,
      createdBy: req.user?.id
    });

    await logActionSafe({
      recordId: project.id,
      title: project.title,
      user: req.user,
      action: 'CREATE_SPONSORED_PROJECT',
      previousValue: null,
      updatedValue: project.toJSON(),
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Created sponsored research project: "${project.title}" (₹${project.sanctionedAmount})`
    });

    const reloaded = await SponsoredProject.findByPk(project.id, {
      include: [
        { model: SponsoredResearchDocument, as: 'documents', where: { isActive: true }, required: false },
        { model: SponsoredResearchInstallment, as: 'installments', required: false }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Sponsored research project created successfully',
      data: formatProjectWithFinancials(reloaded || project)
    });
  } catch (error) {
    console.error('Create sponsored project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record sponsored project',
      error: error.message
    });
  }
};

// @desc    Update existing sponsored project
// @route   PUT /api/sponsored-projects/:id
// @access  Private (Admin, HOD, Coordinator, Faculty owner)
exports.updateSponsoredProject = async (req, res) => {
  try {
    const project = await SponsoredProject.findByPk(req.params.id, {
      include: [
        { model: SponsoredResearchDocument, as: 'documents', where: { isActive: true }, required: false },
        { model: SponsoredResearchInstallment, as: 'installments', required: false }
      ]
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Sponsored project not found' });
    }

    const access = checkProjectAccess(project, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const {
      title,
      principalInvestigator,
      coInvestigators,
      fundingAgency,
      scheme,
      agencyType,
      sanctionOrderNo,
      sanctionDate,
      sanctionYear: manualSanctionYear,
      startDate,
      endDate,
      sanctionedAmount,
      amountReceived,
      status,
      progressPercentage,
      department,
      projectUrl,
      description,
      approvalStatus
    } = req.body;

    // Validate 5 Statuses if provided
    let normalizedStatus = project.status;
    if (status !== undefined) {
      const lowerStatus = String(status).trim().toLowerCase();
      if (STATUS_ALIASES[lowerStatus]) {
        normalizedStatus = STATUS_ALIASES[lowerStatus];
      } else if (VALID_STATUSES.includes(status)) {
        normalizedStatus = status;
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid project status '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}`
        });
      }
    }

    // Validate Dates
    const targetStartDate = startDate !== undefined ? startDate : project.startDate;
    const targetEndDate = endDate !== undefined ? endDate : project.endDate;
    if (targetStartDate && targetEndDate) {
      const durationCheck = calculateProjectDuration(targetStartDate, targetEndDate);
      if (!durationCheck.isValid) {
        return res.status(400).json({
          success: false,
          message: durationCheck.error || 'End Date cannot be earlier than Start Date'
        });
      }
    }

    // Validate Sanction Year
    const targetSanctionDate = sanctionDate !== undefined ? sanctionDate : project.sanctionDate;
    const targetManualYear = manualSanctionYear !== undefined ? manualSanctionYear : project.sanctionYear;
    const yearDerivation = deriveAndValidateSanctionYear(targetSanctionDate, targetManualYear);
    if (!yearDerivation.valid) {
      return res.status(400).json({ success: false, message: yearDerivation.error });
    }

    const oldValues = project.toJSON();
    const oldSanctionYear = project.sanctionYear;
    const oldDepartment = project.department;

    const canChangeApproval = ['admin', 'hod', 'coordinator'].includes(req.user?.role);
    const canChangeDept = req.user?.role === 'admin';

    let parsedAmountReceived = project.amountReceived;
    if (amountReceived !== undefined) {
      if (amountReceived === null || String(amountReceived).trim() === '') {
        parsedAmountReceived = null;
      } else {
        parsedAmountReceived = parseFloat(String(amountReceived).replace(/[^0-9.]/g, '')) || 0.00;
      }
    }

    await project.update({
      title: title !== undefined ? title.trim() : project.title,
      principalInvestigator: principalInvestigator !== undefined ? principalInvestigator.trim() : project.principalInvestigator,
      coInvestigators: coInvestigators !== undefined ? (coInvestigators ? coInvestigators.trim() : null) : project.coInvestigators,
      fundingAgency: fundingAgency !== undefined ? fundingAgency.trim() : project.fundingAgency,
      scheme: scheme !== undefined ? (scheme ? scheme.trim() : null) : project.scheme,
      agencyType: agencyType !== undefined ? agencyType : project.agencyType,
      sanctionOrderNo: sanctionOrderNo !== undefined ? (sanctionOrderNo ? sanctionOrderNo.trim() : null) : project.sanctionOrderNo,
      sanctionDate: targetSanctionDate || null,
      sanctionYear: yearDerivation.sanctionYear,
      academicYear: yearDerivation.academicYear,
      startDate: targetStartDate || null,
      endDate: targetEndDate || null,
      sanctionedAmount: sanctionedAmount !== undefined ? (parseFloat(sanctionedAmount) || 0.00) : project.sanctionedAmount,
      amountReceived: parsedAmountReceived,
      status: normalizedStatus,
      progressPercentage: progressPercentage !== undefined ? (parseInt(progressPercentage, 10) || 0) : project.progressPercentage,
      department: (canChangeDept && department !== undefined) ? department.trim() : project.department,
      projectUrl: projectUrl !== undefined ? (projectUrl ? projectUrl.trim() : null) : project.projectUrl,
      description: description !== undefined ? (description ? description.trim() : null) : project.description,
      approvalStatus: (canChangeApproval && approvalStatus !== undefined) ? approvalStatus : project.approvalStatus
    });

    // Check if Sanction Year or Department changed and relocate Drive folders in background
    if (project.sanctionYear !== oldSanctionYear || project.department !== oldDepartment) {
      const driveDoc = (project.documents || []).find(d => d.sourceType === 'drive_upload' && d.driveFolderId);
      if (driveDoc && driveDoc.driveFolderId) {
        googleDriveService.relocateSponsoredProjectFolder({
          currentProjectFolderId: driveDoc.driveFolderId,
          newSanctionYear: project.sanctionYear,
          department: project.department,
          projectId: project.id
        }).catch(err => console.warn('[SponsoredDrive] Background folder relocation warning:', err.message));
      }
    }

    await logActionSafe({
      recordId: project.id,
      title: project.title,
      user: req.user,
      action: 'UPDATE_SPONSORED_PROJECT',
      previousValue: oldValues,
      updatedValue: project.toJSON(),
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Updated sponsored project: "${project.title}"`
    });

    const reloaded = await SponsoredProject.findByPk(project.id, {
      include: [
        { model: SponsoredResearchDocument, as: 'documents', where: { isActive: true }, required: false },
        { model: SponsoredResearchInstallment, as: 'installments', required: false }
      ]
    });

    res.json({
      success: true,
      message: 'Sponsored project updated successfully',
      data: formatProjectWithFinancials(reloaded || project)
    });
  } catch (error) {
    console.error('Update sponsored project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sponsored project',
      error: error.message
    });
  }
};

// @desc    Delete a sponsored project & clean up associated documents and installments
// @route   DELETE /api/sponsored-projects/:id
// @access  Private (Admin, HOD, Coordinator, Faculty owner)
exports.deleteSponsoredProject = async (req, res) => {
  try {
    const project = await SponsoredProject.findByPk(req.params.id, {
      include: [
        { model: SponsoredResearchDocument, as: 'documents', required: false },
        { model: SponsoredResearchInstallment, as: 'installments', required: false }
      ]
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Sponsored project not found' });
    }

    const access = checkProjectAccess(project, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const oldValues = project.toJSON();

    // 1. Clean up managed files from Google Drive or local server storage
    if (project.documents && project.documents.length > 0) {
      for (const doc of project.documents) {
        if (doc.sourceType === 'local_upload' && doc.driveFileId) {
          try {
            if (fs.existsSync(doc.driveFileId)) fs.unlinkSync(doc.driveFileId);
          } catch (_) {}
        } else if (doc.sourceType === 'drive_upload' && doc.driveFileId) {
          try {
            googleDriveService.deleteSponsoredDocumentFile(doc.driveFileId).catch(() => {});
          } catch (_) {}
        }
      }
    }

    // 2. Cascade delete documents and installments explicitly
    try {
      await SponsoredResearchDocument.destroy({ where: { projectId: project.id } });
      await SponsoredResearchInstallment.destroy({ where: { projectId: project.id } });
    } catch (cleanupErr) {
      console.warn('[SponsoredProjectController] Cleanup notice:', cleanupErr.message);
    }

    // 3. Delete project record
    await project.destroy();

    // 4. Safe audit log
    await logActionSafe({
      recordId: req.params.id,
      title: oldValues.title || 'Sponsored Project',
      user: req.user,
      action: 'DELETE_SPONSORED_PROJECT',
      previousValue: oldValues,
      updatedValue: null,
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Deleted sponsored project: "${oldValues.title || req.params.id}"`
    });

    res.json({
      success: true,
      message: 'Sponsored project deleted successfully'
    });
  } catch (error) {
    console.error('Delete sponsored project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sponsored project',
      error: error.message
    });
  }
};

// @desc    Direct File Upload for Agreement Letter or Payment Receipt
// @route   POST /api/sponsored-projects/:id/documents/upload
// @access  Private (Admin, HOD, Coordinator, Faculty owner)
exports.uploadSponsoredDocuments = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { category } = req.query; // 'agreement_letter' or 'payment_receipt'

    if (!category || !['agreement_letter', 'payment_receipt'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Valid document category ("agreement_letter" or "payment_receipt") is required.'
      });
    }

    const project = await SponsoredProject.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Sponsored project not found' });
    }

    const access = checkProjectAccess(project, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one document file to upload.' });
    }

    // Check existing count for this category
    const existingCount = await SponsoredResearchDocument.count({
      where: { projectId: project.id, documentCategory: category, isActive: true }
    });

    if (existingCount + files.length > MAX_DOCUMENTS_PER_CATEGORY) {
      return res.status(400).json({
        success: false,
        message: `Limit exceeded: Maximum ${MAX_DOCUMENTS_PER_CATEGORY} documents allowed per category. Currently attached: ${existingCount}.`
      });
    }

    const uploaded = [];
    const failed = [];

    for (const file of files) {
      // Validate file format
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        failed.push({ fileName: file.originalname, error: 'Unsupported format. Allowed: PDF, JPG, PNG.' });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        failed.push({ fileName: file.originalname, error: 'File size exceeds 10MB limit.' });
        continue;
      }

      let createdDoc = null;

      // 1. Attempt institutional Google Drive upload
      if (googleDriveService.isDriveConfigured()) {
        try {
          const driveResult = await googleDriveService.uploadSponsoredDocumentFile({
            projectId: project.id,
            department: project.department,
            sanctionYear: project.sanctionYear,
            category,
            fileBuffer: file.buffer,
            fileName: file.originalname,
            mimeType: file.mimetype
          });

          createdDoc = await SponsoredResearchDocument.create({
            projectId: project.id,
            documentCategory: category,
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
          console.warn(`[SponsoredProjectController] Drive upload notice for ${file.originalname}: ${driveErr.message}`);
          console.warn(`[SponsoredProjectController] Falling back to platform server storage...`);
        }
      }

      // 2. Platform server storage fallback
      if (!createdDoc) {
        try {
          const docId = crypto.randomUUID();
          const ext = path.extname(file.originalname);
          const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
          const diskFileName = `${docId}_${safeBase}${ext}`;

          const yearFolder = String(project.sanctionYear || 'pending');
          const deptFolder = (project.department || 'general').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
          const uploadsDir = path.resolve(__dirname, '../uploads/sponsored-projects', yearFolder, deptFolder, category);
          fs.mkdirSync(uploadsDir, { recursive: true });

          const targetFilePath = path.join(uploadsDir, diskFileName);
          fs.writeFileSync(targetFilePath, file.buffer);

          const host = req.get('host') || 'localhost:5000';
          const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
          const fileUrl = `${protocol}://${host}/api/sponsored-projects/documents/file/${docId}`;

          createdDoc = await SponsoredResearchDocument.create({
            id: docId,
            projectId: project.id,
            documentCategory: category,
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
        } catch (localErr) {
          console.error(`[SponsoredProjectController] Server storage error:`, localErr.message);
          failed.push({ fileName: file.originalname, error: localErr.message });
        }
      }

      if (createdDoc) {
        uploaded.push(createdDoc);
      }
    }

    if (uploaded.length > 0) {
      await logActionSafe({
        recordId: project.id,
        title: project.title,
        user: req.user,
        action: 'ADD_SPONSORED_DOCUMENT',
        previousValue: null,
        updatedValue: { category, count: uploaded.length },
        ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
        remarks: `Uploaded ${uploaded.length} ${category.replace('_', ' ')} file(s) for: ${project.title}`
      });
    }

    res.status(uploaded.length > 0 ? 201 : 400).json({
      success: uploaded.length > 0,
      message: uploaded.length > 0
        ? `Successfully attached ${uploaded.length} of ${files.length} document(s).`
        : 'Failed to upload document(s).',
      uploaded,
      failed
    });
  } catch (error) {
    console.error('Upload sponsored documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process document upload',
      error: error.message
    });
  }
};

// @desc    Add external Google Drive links for Agreement Letter or Payment Receipt
// @route   POST /api/sponsored-projects/:id/documents/links
// @access  Private (Admin, HOD, Coordinator, Faculty owner)
exports.addSponsoredDocumentLinks = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const { category, links } = req.body; // links: array of string URLs

    if (!category || !['agreement_letter', 'payment_receipt'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Valid document category ("agreement_letter" or "payment_receipt") is required.'
      });
    }

    if (!Array.isArray(links) || links.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one Google Drive document link.'
      });
    }

    const project = await SponsoredProject.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Sponsored project not found' });
    }

    const access = checkProjectAccess(project, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const existingCount = await SponsoredResearchDocument.count({
      where: { projectId: project.id, documentCategory: category, isActive: true }
    });

    if (existingCount + links.length > MAX_DOCUMENTS_PER_CATEGORY) {
      return res.status(400).json({
        success: false,
        message: `Limit exceeded: Maximum ${MAX_DOCUMENTS_PER_CATEGORY} documents allowed per category. Currently attached: ${existingCount}.`
      });
    }

    const createdDocs = [];
    const invalidLinks = [];

    for (const url of links) {
      const validation = googleDriveService.validateDriveUrl(url);
      if (!validation.valid) {
        invalidLinks.push({ url, error: validation.error });
        continue;
      }

      // Prevent duplicate link on the same project
      const duplicate = await SponsoredResearchDocument.findOne({
        where: {
          projectId: project.id,
          documentCategory: category,
          driveUrl: validation.sanitizedUrl,
          isActive: true
        }
      });

      if (duplicate) {
        invalidLinks.push({ url, error: 'Document link already attached to this project' });
        continue;
      }

      const verification = await googleDriveService.verifyDriveLinkAccess(validation.sanitizedUrl);

      const record = await SponsoredResearchDocument.create({
        projectId: project.id,
        documentCategory: category,
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

      createdDocs.push(record);
    }

    if (createdDocs.length > 0) {
      await logActionSafe({
        recordId: project.id,
        title: project.title,
        user: req.user,
        action: 'ADD_SPONSORED_DOCUMENT_LINK',
        previousValue: null,
        updatedValue: { category, count: createdDocs.length },
        ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
        remarks: `Attached ${createdDocs.length} Google Drive link(s) for ${category.replace('_', ' ')}`
      });
    }

    res.status(201).json({
      success: createdDocs.length > 0,
      message: `Successfully attached ${createdDocs.length} Google Drive document link(s).`,
      documents: createdDocs,
      invalidLinks: invalidLinks.length > 0 ? invalidLinks : undefined
    });
  } catch (error) {
    console.error('Add sponsored document links error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add document links',
      error: error.message
    });
  }
};

// @desc    Delete a document attachment reference
// @route   DELETE /api/sponsored-projects/:id/documents/:documentId
// @access  Private (Admin, HOD, Coordinator, Faculty owner)
exports.deleteSponsoredDocument = async (req, res) => {
  try {
    const { id: projectId, documentId } = req.params;

    const project = await SponsoredProject.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Sponsored project not found' });
    }

    const access = checkProjectAccess(project, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const doc = await SponsoredResearchDocument.findOne({
      where: { id: documentId, projectId: project.id, isActive: true }
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document attachment not found' });
    }

    // Clean up file if managed
    if (doc.sourceType === 'local_upload' && doc.driveFileId) {
      try {
        if (fs.existsSync(doc.driveFileId)) fs.unlinkSync(doc.driveFileId);
      } catch (_) {}
    } else if (doc.sourceType === 'drive_upload' && doc.driveFileId) {
      googleDriveService.deleteSponsoredDocumentFile(doc.driveFileId).catch(() => {});
    }

    await doc.destroy();

    await logActionSafe({
      recordId: doc.id,
      title: doc.fileName,
      user: req.user,
      action: 'REMOVE_SPONSORED_DOCUMENT',
      previousValue: doc.toJSON(),
      updatedValue: null,
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Removed document "${doc.fileName}" from project: ${project.title}`
    });

    res.json({
      success: true,
      message: 'Document attachment removed successfully'
    });
  } catch (error) {
    console.error('Delete sponsored document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document attachment',
      error: error.message
    });
  }
};

// @desc    Add an installment to a sponsored project
// @route   POST /api/sponsored-projects/:id/installments
// @access  Private (Admin, HOD, Coordinator, Faculty owner)
exports.addSponsoredInstallment = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const {
      installmentNumber,
      paymentDate,
      amount,
      paymentReference,
      notes
    } = req.body;

    const project = await SponsoredProject.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Sponsored project not found' });
    }

    const access = checkProjectAccess(project, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ success: false, message: 'Installment amount must be a non-negative number' });
    }

    const installment = await SponsoredResearchInstallment.create({
      projectId: project.id,
      installmentNumber: installmentNumber ? parseInt(installmentNumber, 10) : null,
      paymentDate: paymentDate || null,
      amount: parsedAmount,
      paymentReference: paymentReference ? String(paymentReference).trim() : null,
      notes: notes ? String(notes).trim() : null,
      createdBy: req.user.id
    });

    await logActionSafe({
      recordId: installment.id,
      title: `Installment ₹${parsedAmount}`,
      user: req.user,
      action: 'ADD_SPONSORED_INSTALLMENT',
      previousValue: null,
      updatedValue: installment.toJSON(),
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Added installment of ₹${parsedAmount} for project: ${project.title}`
    });

    res.status(201).json({
      success: true,
      message: 'Installment recorded successfully',
      data: installment
    });
  } catch (error) {
    console.error('Add sponsored installment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record installment',
      error: error.message
    });
  }
};

// @desc    Update an installment
// @route   PUT /api/sponsored-projects/:id/installments/:installmentId
// @access  Private (Admin, HOD, Coordinator, Faculty owner)
exports.updateSponsoredInstallment = async (req, res) => {
  try {
    const { id: projectId, installmentId } = req.params;
    const {
      installmentNumber,
      paymentDate,
      amount,
      paymentReference,
      notes
    } = req.body;

    const project = await SponsoredProject.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Sponsored project not found' });
    }

    const access = checkProjectAccess(project, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const installment = await SponsoredResearchInstallment.findOne({
      where: { id: installmentId, projectId: project.id }
    });

    if (!installment) {
      return res.status(404).json({ success: false, message: 'Installment not found' });
    }

    let parsedAmount = installment.amount;
    if (amount !== undefined) {
      parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ success: false, message: 'Installment amount must be a non-negative number' });
      }
    }

    const oldValues = installment.toJSON();

    await installment.update({
      installmentNumber: installmentNumber !== undefined ? (installmentNumber ? parseInt(installmentNumber, 10) : null) : installment.installmentNumber,
      paymentDate: paymentDate !== undefined ? (paymentDate || null) : installment.paymentDate,
      amount: parsedAmount,
      paymentReference: paymentReference !== undefined ? (paymentReference ? String(paymentReference).trim() : null) : installment.paymentReference,
      notes: notes !== undefined ? (notes ? String(notes).trim() : null) : installment.notes
    });

    await logActionSafe({
      recordId: installment.id,
      title: `Installment ₹${parsedAmount}`,
      user: req.user,
      action: 'UPDATE_SPONSORED_INSTALLMENT',
      previousValue: oldValues,
      updatedValue: installment.toJSON(),
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Updated installment for project: ${project.title}`
    });

    res.json({
      success: true,
      message: 'Installment updated successfully',
      data: installment
    });
  } catch (error) {
    console.error('Update sponsored installment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update installment',
      error: error.message
    });
  }
};

// @desc    Delete an installment
// @route   DELETE /api/sponsored-projects/:id/installments/:installmentId
// @access  Private (Admin, HOD, Coordinator, Faculty owner)
exports.deleteSponsoredInstallment = async (req, res) => {
  try {
    const { id: projectId, installmentId } = req.params;

    const project = await SponsoredProject.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Sponsored project not found' });
    }

    const access = checkProjectAccess(project, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const installment = await SponsoredResearchInstallment.findOne({
      where: { id: installmentId, projectId: project.id }
    });

    if (!installment) {
      return res.status(404).json({ success: false, message: 'Installment not found' });
    }

    const oldValues = installment.toJSON();
    await installment.destroy();

    await logActionSafe({
      recordId: installment.id,
      title: `Installment ₹${installment.amount}`,
      user: req.user,
      action: 'DELETE_SPONSORED_INSTALLMENT',
      previousValue: oldValues,
      updatedValue: null,
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Deleted installment of ₹${installment.amount} from project: ${project.title}`
    });

    res.json({
      success: true,
      message: 'Installment deleted successfully'
    });
  } catch (error) {
    console.error('Delete sponsored installment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete installment',
      error: error.message
    });
  }
};

// @desc    Bulk Upload Sponsored Projects from Excel/CSV with Sanction Year & Drive Links
// @route   POST /api/sponsored-projects/bulk
// @access  Private (Admin, HOD, Coordinator, Faculty)
exports.bulkUploadSponsoredProjects = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, projects, defaultDepartment, defaultYear } = req.body;
    const rawList = items || projects || req.body;

    if (!Array.isArray(rawList) || rawList.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of sponsored research project records to upload.'
      });
    }

    const validRecords = [];
    const recordDocLinks = []; // [{ agreementLetterLinks: [], paymentReceiptLinks: [] }]
    const errorRows = [];

    const sanitizeDate = (val) => {
      if (!val) return null;
      const str = String(val).trim();
      if (!str || ['nil', 'n/a', 'null', 'none'].includes(str.toLowerCase())) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

      const parts = str.split(/[\/\-\.]/);
      if (parts.length === 3) {
        let day = parts[0];
        let month = parts[1];
        let year = parts[2];
        if (day.length === 4) {
          const temp = day;
          day = year;
          year = temp;
        }
        if (day.length === 1) day = '0' + day;
        if (month.length === 1) month = '0' + month;
        if (year.length === 2) year = '20' + year;
        if (day.length === 2 && month.length === 2 && year.length === 4) {
          const m = parseInt(month, 10);
          const d = parseInt(day, 10);
          if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return `${year}-${month}-${day}`;
          }
        }
      }
      return null;
    };

    const normalizeAgencyType = (raw) => {
      if (!raw) return 'Government (National)';
      const s = String(raw).toLowerCase().trim();
      if (s.includes('state')) return 'Government (State)';
      if (s.includes('gov') || s.includes('national') || s.includes('central') || s.includes('dst') || s.includes('serb') || s.includes('icmr') || s.includes('dbt') || s.includes('aicte') || s.includes('drdo') || s.includes('isro')) return 'Government (National)';
      if (s.includes('international') || s.includes('foreign') || s.includes('global') || s.includes('horizon') || s.includes('nih') || s.includes('nsf')) return 'International Agency';
      if (s.includes('industry') || s.includes('corporate') || s.includes('private') || s.includes('csr') || s.includes('ltd')) return 'Industry / Corporate';
      if (s.includes('seed') || s.includes('internal') || s.includes('university') || s.includes('intra')) return 'University Seed Money / Internal';
      if (s.includes('ngo') || s.includes('trust') || s.includes('foundation') || s.includes('society')) return 'Non-Governmental Organization (NGO)';
      return String(raw).trim();
    };

    for (let i = 0; i < rawList.length; i++) {
      const row = rawList[i];
      const rowNum = i + 1;

      const title = row.title || row.projectTitle || row['Project Title'] || row['Title'];
      const pi = row.principalInvestigator || row.pi || row['Principal Investigator'] || row['PI'] || row['Principal Investigator (PI)'];
      const agency = row.fundingAgency || row.agency || row['Funding Agency'] || row['Sponsoring Agency'] || row['Sponsor'];

      // Skip completely empty rows
      if (!title && !pi && !agency) continue;

      if (!title || !String(title).trim()) {
        errorRows.push(`Row ${rowNum}: Missing project title.`);
        continue;
      }
      if (!pi || !String(pi).trim()) {
        errorRows.push(`Row ${rowNum}: Missing Principal Investigator (PI) name.`);
        continue;
      }
      if (!agency || !String(agency).trim()) {
        errorRows.push(`Row ${rowNum}: Missing funding agency name.`);
        continue;
      }

      // Validate 5 Statuses accepting aliases; reject invalid statuses
      const rawStatus = row.status || row['Status'] || row['Project Status'] || 'Ongoing';
      const lowerStatus = String(rawStatus).trim().toLowerCase();
      let normalizedStatus = null;
      if (STATUS_ALIASES[lowerStatus]) {
        normalizedStatus = STATUS_ALIASES[lowerStatus];
      } else if (VALID_STATUSES.includes(String(rawStatus).trim())) {
        normalizedStatus = String(rawStatus).trim();
      } else {
        errorRows.push(`Row ${rowNum}: Invalid project status "${rawStatus}". Must be one of: ${VALID_STATUSES.join(', ')}.`);
        continue;
      }

      const coPi = row.coInvestigators || row.coPi || row['Co-Investigators'] || row['Co-PI'] || null;
      const scheme = row.scheme || row.schemeName || row['Scheme'] || row['Scheme / Program'] || null;
      const agencyType = normalizeAgencyType(row.agencyType || row['Agency Type'] || row['Funding Agency Category']);
      const sanctionRef = row.sanctionOrderNo || row.projectRefNo || row['Sanction Order No'] || row['Sanction Order Number'] || null;

      const sanctionDate = sanitizeDate(row.sanctionDate || row['Sanction Date'] || row['Award Date']);
      const startDate = sanitizeDate(row.startDate || row['Start Date']);
      const endDate = sanitizeDate(row.endDate || row['End Date'] || row['Completion Date']);

      // Duration validation
      if (startDate && endDate) {
        const durCheck = calculateProjectDuration(startDate, endDate);
        if (!durCheck.isValid) {
          errorRows.push(`Row ${rowNum}: ${durCheck.error || 'End Date is before Start Date.'}`);
          continue;
        }
      }

      // Sanction Year derivation and validation
      const rawYear = row.sanctionYear || row['Sanction Year'] || row.academicYear || row['Academic Year'] || defaultYear;
      const yearDeriv = deriveAndValidateSanctionYear(sanctionDate, rawYear);
      if (!yearDeriv.valid) {
        errorRows.push(`Row ${rowNum}: ${yearDeriv.error}`);
        continue;
      }

      // Monetary values
      let sanctionAmount = 0;
      const rawAmt = row.sanctionedAmount || row.grantValue || row['Sanctioned Amount'] || row['Sanctioned Amount (INR)'] || row['Total Grant (INR)'];
      if (rawAmt !== undefined && rawAmt !== null && String(rawAmt).trim() !== '') {
        sanctionAmount = parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;
      }

      // Critical bug prevention: Never default missing amountReceived to sanctionedAmount
      let fundsRec = null;
      const rawRec = row.amountReceived || row['Amount Received'] || row['Amount Received (INR)'] || row['Funds Released'];
      if (rawRec !== undefined && rawRec !== null && String(rawRec).trim() !== '') {
        fundsRec = parseFloat(String(rawRec).replace(/[^0-9.]/g, '')) || 0;
      }

      let progress = parseInt(row.progressPercentage || row.progress || row['Progress (%)'] || row['Milestone Progress'], 10);
      if (isNaN(progress)) {
        progress = normalizedStatus === 'Completed' ? 100 : (normalizedStatus === 'Sanctioned' ? 10 : 0);
      }

      const dept = row.department || row['Department'] || defaultDepartment || req.user?.department || 'General';
      const projectUrl = row.projectUrl || row.url || row['Project URL'] || null;
      const description = row.description || row['Description'] || row['Project Objectives & Deliverables'] || null;

      // Extract Drive links from Agreement Letter & Payment Receipt columns
      const extractLinks = (val) => {
        if (!val) return [];
        return String(val)
          .split(/[\r\n;,]+/)
          .map(s => s.trim())
          .filter(s => s.length > 0 && googleDriveService.isValidDriveUrl(s));
      };

      const agreementLinks = extractLinks(row.agreementLetter || row['Agreement Letter'] || row['Agreement Letters']);
      const paymentLinks = extractLinks(row.paymentReceipt || row['Payment Receipt'] || row['Payment Receipts']);

      validRecords.push({
        title: String(title).trim(),
        principalInvestigator: String(pi).trim(),
        coInvestigators: coPi ? String(coPi).trim() : null,
        fundingAgency: String(agency).trim(),
        scheme: scheme ? String(scheme).trim() : null,
        agencyType,
        sanctionOrderNo: sanctionRef ? String(sanctionRef).trim() : null,
        sanctionDate,
        sanctionYear: yearDeriv.sanctionYear,
        academicYear: yearDeriv.academicYear,
        startDate,
        endDate,
        sanctionedAmount: sanctionAmount,
        amountReceived: fundsRec,
        status: normalizedStatus,
        progressPercentage: progress,
        department: dept.trim(),
        projectUrl: projectUrl ? String(projectUrl).trim() : null,
        description: description ? String(description).trim() : null,
        approvalStatus: req.user?.role === 'admin' ? 'approved' : 'submitted',
        createdBy: req.user?.id
      });

      recordDocLinks.push({ agreementLinks, paymentLinks });
    }

    if (validRecords.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: errorRows.length > 0 ? errorRows[0] : 'No valid sponsored project records found.',
        errors: errorRows
      });
    }

    const createdProjects = await SponsoredProject.bulkCreate(validRecords, {
      transaction: t,
      returning: true
    });

    // Create document records for parsed Google Drive links
    const docRecordsToCreate = [];
    createdProjects.forEach((proj, idx) => {
      const { agreementLinks, paymentLinks } = recordDocLinks[idx] || { agreementLinks: [], paymentLinks: [] };

      agreementLinks.forEach(link => {
        const fileId = googleDriveService.extractDriveFileId(link);
        docRecordsToCreate.push({
          projectId: proj.id,
          documentCategory: 'agreement_letter',
          sourceType: 'drive_link',
          driveFileId: fileId,
          driveUrl: link,
          fileName: `Agreement Letter (${fileId ? fileId.slice(0, 8) : 'Drive'})`,
          uploadedBy: req.user?.id,
          accessStatus: 'pending_verification',
          isActive: true
        });
      });

      paymentLinks.forEach(link => {
        const fileId = googleDriveService.extractDriveFileId(link);
        docRecordsToCreate.push({
          projectId: proj.id,
          documentCategory: 'payment_receipt',
          sourceType: 'drive_link',
          driveFileId: fileId,
          driveUrl: link,
          fileName: `Payment Receipt (${fileId ? fileId.slice(0, 8) : 'Drive'})`,
          uploadedBy: req.user?.id,
          accessStatus: 'pending_verification',
          isActive: true
        });
      });
    });

    if (docRecordsToCreate.length > 0) {
      await SponsoredResearchDocument.bulkCreate(docRecordsToCreate, { transaction: t });
    }

    await t.commit();

    await logActionSafe({
      user: req.user,
      action: 'BULK_UPLOAD_SPONSORED_PROJECTS',
      previousValue: null,
      updatedValue: {
        count: createdProjects.length,
        documentsCount: docRecordsToCreate.length,
        errorsCount: errorRows.length
      },
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Bulk uploaded ${createdProjects.length} sponsored projects (${docRecordsToCreate.length} document links attached)`
    });

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${createdProjects.length} sponsored project(s) with ${docRecordsToCreate.length} document link(s).`,
      count: createdProjects.length,
      documentLinksCount: docRecordsToCreate.length,
      errors: errorRows
    });
  } catch (error) {
    await t.rollback();
    console.error('Bulk upload sponsored projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload transaction',
      error: error.message
    });
  }
};

// @desc    Clear all sponsored projects (Admin / HOD scope)
// @route   DELETE /api/sponsored-projects/clear-all
// @access  Private (Admin, HOD, Coordinator)
exports.clearAllSponsoredProjects = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'SponsoredProject', true);

    let count = 0;
    await sequelize.transaction(async (t) => {
      // Find matching projects to cascade document and installment deletion
      const matchingProjects = await SponsoredProject.findAll({ where, attributes: ['id'], transaction: t });
      const ids = matchingProjects.map(p => p.id);
      if (ids.length > 0) {
        await SponsoredResearchDocument.destroy({ where: { projectId: ids }, transaction: t });
        await SponsoredResearchInstallment.destroy({ where: { projectId: ids }, transaction: t });
      }
      count = await SponsoredProject.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_SPONSORED_PROJECTS',
      title: `Cleared sponsored projects: ${scopeDescription}`,
      remarks: `Deleted ${count} sponsored research project records. Scope: ${scopeDescription}`,
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null
    });

    res.json({
      success: true,
      message: `Successfully deleted ${count} sponsored research records for ${scopeDescription}.`
    });
  } catch (error) {
    console.error('Clear all sponsored projects error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to clear sponsored project records'
    });
  }
};
