const { SponsoredProject, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../middleware/auditLogger');
const { sendNotification } = require('../middleware/notificationHelper');

// @desc    Get all sponsored research projects with filtering, searching, and role isolation
// @route   GET /api/sponsored-projects
// @access  Private / Public (optional)
exports.getSponsoredProjects = async (req, res) => {
  try {
    const {
      status,
      agencyType,
      academicYear,
      year,
      department,
      fundingAgency,
      search
    } = req.query;

    const where = {};
    const selectedYear = academicYear || year;

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

    const projects = await SponsoredProject.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department'],
        required: false
      }],
      order: [
        ['academicYear', 'DESC'],
        ['sanctionDate', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
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
    const { department, academicYear, year } = req.query;
    const where = {};
    const selectedYear = academicYear || year;

    if (selectedYear && selectedYear !== 'all') {
      where.academicYear = selectedYear;
    }

    if (department && department !== 'all') {
      where.department = {
        [Op.iLike]: `%${department.replace(/-/g, '%')}%`
      };
    }

    // Role filtering
    if (req.user && (req.user.role === 'coordinator' || req.user.role === 'hod')) {
      if (req.user.department && req.user.department !== 'All') {
        where.department = {
          [Op.iLike]: `%${req.user.department}%`
        };
      }
    }

    const allProjects = await SponsoredProject.findAll({
      where,
      attributes: ['id', 'status', 'agencyType', 'sanctionedAmount', 'amountReceived', 'department', 'academicYear']
    });

    let totalSanctionedAmount = 0;
    let totalFundsReceived = 0;
    let ongoingCount = 0;
    let completedCount = 0;
    let sanctionedCount = 0;
    let proposalCount = 0;

    const byAgencyType = {
      government: 0,
      international: 0,
      industry: 0,
      seedMoney: 0,
      other: 0
    };

    allProjects.forEach(p => {
      const sAmt = parseFloat(p.sanctionedAmount) || 0;
      const rAmt = parseFloat(p.amountReceived) || 0;
      totalSanctionedAmount += sAmt;
      totalFundsReceived += rAmt;

      const st = (p.status || '').toLowerCase();
      if (st.includes('ongoing')) ongoingCount++;
      else if (st.includes('completed')) completedCount++;
      else if (st.includes('sanction')) sanctionedCount++;
      else if (st.includes('proposal') || st.includes('submitted')) proposalCount++;

      const at = (p.agencyType || '').toLowerCase();
      if (at.includes('government') || at.includes('national') || at.includes('state')) byAgencyType.government++;
      else if (at.includes('international')) byAgencyType.international++;
      else if (at.includes('industry') || at.includes('corporate')) byAgencyType.industry++;
      else if (at.includes('seed') || at.includes('internal')) byAgencyType.seedMoney++;
      else byAgencyType.other++;
    });

    res.json({
      success: true,
      stats: {
        totalProjects: allProjects.length,
        totalSanctionedAmount,
        totalFundsReceived,
        ongoingCount,
        completedCount,
        sanctionedCount,
        proposalCount,
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

// @desc    Get single sponsored project details
// @route   GET /api/sponsored-projects/:id
// @access  Private
exports.getSponsoredProject = async (req, res) => {
  try {
    const project = await SponsoredProject.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department'],
        required: false
      }]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Sponsored project not found'
      });
    }

    res.json({
      success: true,
      data: project
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
      startDate,
      endDate,
      sanctionedAmount,
      amountReceived,
      status,
      progressPercentage,
      department,
      academicYear,
      projectUrl,
      description,
      approvalStatus
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project title is required'
      });
    }

    if (!principalInvestigator || !principalInvestigator.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Principal Investigator (PI) name is required'
      });
    }

    if (!fundingAgency || !fundingAgency.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Funding Agency name is required'
      });
    }

    const assignedDept = department || req.user?.department || 'General';

    const project = await SponsoredProject.create({
      title: title.trim(),
      principalInvestigator: principalInvestigator.trim(),
      coInvestigators: coInvestigators ? coInvestigators.trim() : null,
      fundingAgency: fundingAgency.trim(),
      scheme: scheme ? scheme.trim() : null,
      agencyType: agencyType || 'Government (National)',
      sanctionOrderNo: sanctionOrderNo ? sanctionOrderNo.trim() : null,
      sanctionDate: sanctionDate || null,
      startDate: startDate || null,
      endDate: endDate || null,
      sanctionedAmount: parseFloat(sanctionedAmount) || 0.00,
      amountReceived: parseFloat(amountReceived) || 0.00,
      status: status || 'Ongoing',
      progressPercentage: parseInt(progressPercentage, 10) || 0,
      department: assignedDept,
      academicYear: academicYear || '2024-2025',
      projectUrl: projectUrl ? projectUrl.trim() : null,
      description: description ? description.trim() : null,
      approvalStatus: approvalStatus || 'approved',
      createdBy: req.user?.id
    });

    if (req.user) {
      await logAction({
        userId: req.user.id,
        action: 'CREATE',
        resourceType: 'SponsoredProject',
        resourceId: project.id,
        details: `Created sponsored research grant: "${project.title}" funded by ${project.fundingAgency} (₹${project.sanctionedAmount})`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Sponsored research project created successfully',
      data: project
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
    const project = await SponsoredProject.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Sponsored project not found'
      });
    }

    // Role check
    if (req.user && req.user.role !== 'admin' && req.user.role !== 'hod' && req.user.role !== 'coordinator') {
      if (project.createdBy && project.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to edit this sponsored project'
        });
      }
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
      startDate,
      endDate,
      sanctionedAmount,
      amountReceived,
      status,
      progressPercentage,
      department,
      academicYear,
      projectUrl,
      description,
      approvalStatus
    } = req.body;

    await project.update({
      title: title !== undefined ? title.trim() : project.title,
      principalInvestigator: principalInvestigator !== undefined ? principalInvestigator.trim() : project.principalInvestigator,
      coInvestigators: coInvestigators !== undefined ? (coInvestigators ? coInvestigators.trim() : null) : project.coInvestigators,
      fundingAgency: fundingAgency !== undefined ? fundingAgency.trim() : project.fundingAgency,
      scheme: scheme !== undefined ? (scheme ? scheme.trim() : null) : project.scheme,
      agencyType: agencyType !== undefined ? agencyType : project.agencyType,
      sanctionOrderNo: sanctionOrderNo !== undefined ? (sanctionOrderNo ? sanctionOrderNo.trim() : null) : project.sanctionOrderNo,
      sanctionDate: sanctionDate !== undefined ? (sanctionDate || null) : project.sanctionDate,
      startDate: startDate !== undefined ? (startDate || null) : project.startDate,
      endDate: endDate !== undefined ? (endDate || null) : project.endDate,
      sanctionedAmount: sanctionedAmount !== undefined ? (parseFloat(sanctionedAmount) || 0.00) : project.sanctionedAmount,
      amountReceived: amountReceived !== undefined ? (parseFloat(amountReceived) || 0.00) : project.amountReceived,
      status: status !== undefined ? status : project.status,
      progressPercentage: progressPercentage !== undefined ? (parseInt(progressPercentage, 10) || 0) : project.progressPercentage,
      department: department !== undefined ? department : project.department,
      academicYear: academicYear !== undefined ? academicYear : project.academicYear,
      projectUrl: projectUrl !== undefined ? (projectUrl ? projectUrl.trim() : null) : project.projectUrl,
      description: description !== undefined ? (description ? description.trim() : null) : project.description,
      approvalStatus: approvalStatus !== undefined ? approvalStatus : project.approvalStatus
    });

    if (req.user) {
      await logAction({
        userId: req.user.id,
        action: 'UPDATE',
        resourceType: 'SponsoredProject',
        resourceId: project.id,
        details: `Updated sponsored project: "${project.title}"`
      });
    }

    res.json({
      success: true,
      message: 'Sponsored project updated successfully',
      data: project
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

// @desc    Delete a sponsored project
// @route   DELETE /api/sponsored-projects/:id
// @access  Private (Admin, HOD, Coordinator, Faculty owner)
exports.deleteSponsoredProject = async (req, res) => {
  try {
    const project = await SponsoredProject.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Sponsored project not found'
      });
    }

    if (req.user && req.user.role !== 'admin' && req.user.role !== 'hod' && req.user.role !== 'coordinator') {
      if (project.createdBy && project.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this record'
        });
      }
    }

    const titleCopy = project.title;
    await project.destroy();

    if (req.user) {
      await logAction({
        userId: req.user.id,
        action: 'DELETE',
        resourceType: 'SponsoredProject',
        resourceId: req.params.id,
        details: `Deleted sponsored project: "${titleCopy}"`
      });
    }

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

// @desc    Bulk upload sponsored projects from parsed Excel or CSV
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

    const createdRecords = [];
    const errorRows = [];

    const sanitizeDate = (val) => {
      if (!val) return null;
      const str = String(val).trim();
      if (!str || str.toLowerCase() === 'nil' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') return null;
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

    const normalizeStatus = (raw) => {
      if (!raw) return 'Ongoing';
      const s = String(raw).toLowerCase().trim();
      if (s.includes('complete')) return 'Completed';
      if (s.includes('sanction') && !s.includes('ongoing')) return 'Sanctioned';
      if (s.includes('proposal') || s.includes('submit') || s.includes('review')) return 'Proposal Submitted';
      if (s.includes('terminate') || s.includes('close')) return 'Terminated';
      return 'Ongoing';
    };

    for (let i = 0; i < rawList.length; i++) {
      const row = rawList[i];
      const title = row.title || row.projectTitle || row['Project Title'] || row['Title'];
      const pi = row.principalInvestigator || row.pi || row.participants || row['Principal Investigator'] || row['PI'] || row['Principal Investigator (PI)'] || row['Investigator'] || row['Author Name'];
      const agency = row.fundingAgency || row.agency || row.organization || row['Funding Agency'] || row['Sponsoring Agency'] || row['Agency'] || row['Sponsor'];

      if (!title || !String(title).trim()) {
        errorRows.push(`Row #${i + 1}: Missing project title`);
        continue;
      }

      if (!pi || !String(pi).trim()) {
        errorRows.push(`Row #${i + 1}: Missing Principal Investigator (PI) name`);
        continue;
      }

      if (!agency || !String(agency).trim()) {
        errorRows.push(`Row #${i + 1}: Missing funding agency name`);
        continue;
      }

      const coPi = row.coInvestigators || row.coPi || row['Co-Principal Investigator'] || row['Co-PI'] || row['Co Investigators'] || row['Team'] || null;
      const scheme = row.scheme || row.schemeName || row['Scheme'] || row['Funding Scheme'] || row.subcategory || null;
      const agencyType = normalizeAgencyType(row.agencyType || row['Agency Type'] || row['Funding Type'] || row.category);
      const sanctionRef = row.sanctionOrderNo || row.projectRefNo || row.impact || row['Sanction Order No'] || row['Sanction Reference'] || row['Project ID'] || row['Reference No'] || null;

      const sanctionDate = sanitizeDate(row.sanctionDate || row.date || row['Sanction Date'] || row['Award Date']);
      const startDate = sanitizeDate(row.startDate || row['Start Date'] || row.date);
      const endDate = sanitizeDate(row.endDate || row['End Date'] || row['Completion Date']);

      let sanctionAmount = 0;
      const rawAmt = row.sanctionedAmount || row.score || row.amount || row.grantValue || row['Sanctioned Amount'] || row['Grant Amount'] || row['Total Grant (INR)'];
      if (rawAmt !== undefined && rawAmt !== null && rawAmt !== '') {
        sanctionAmount = parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;
      }

      let fundsRec = 0;
      const rawRec = row.amountReceived || row.fundsReceived || row['Amount Received'] || row['Funds Released'] || row['Received Amount (INR)'];
      if (rawRec !== undefined && rawRec !== null && rawRec !== '') {
        fundsRec = parseFloat(String(rawRec).replace(/[^0-9.]/g, '')) || 0;
      } else {
        fundsRec = sanctionAmount; // Default to sanctioned amount if omitted
      }

      const status = normalizeStatus(row.status || row.rank || row['Status'] || row['Project Status']);
      
      let progress = parseInt(row.progressPercentage || row.progress || row['Progress (%)'] || row['Milestone Progress'], 10);
      if (isNaN(progress)) {
        progress = status === 'Completed' ? 100 : (status === 'Sanctioned' ? 10 : 50);
      }

      const dept = row.department || row['Department'] || defaultDepartment || req.user?.department || 'General';
      const year = row.academicYear || row.year || row['Academic Year'] || row['Year'] || defaultYear || '2024-2025';
      const projectUrl = row.projectUrl || row.url || row['Project URL'] || row['URL'] || row['Document Link'] || null;
      const description = row.description || row.abstract || row['Description'] || row['Project Summary'] || row['Objectives'] || null;

      try {
        const created = await SponsoredProject.create({
          title: String(title).trim(),
          principalInvestigator: String(pi).trim(),
          coInvestigators: coPi ? String(coPi).trim() : null,
          fundingAgency: String(agency).trim(),
          scheme: scheme ? String(scheme).trim() : null,
          agencyType,
          sanctionOrderNo: sanctionRef ? String(sanctionRef).trim() : null,
          sanctionDate,
          startDate,
          endDate,
          sanctionedAmount: sanctionAmount,
          amountReceived: fundsRec,
          status,
          progressPercentage: progress,
          department: dept,
          academicYear: year,
          projectUrl: projectUrl ? String(projectUrl).trim() : null,
          description: description ? String(description).trim() : null,
          approvalStatus: 'approved',
          createdBy: req.user?.id
        }, { transaction: t });

        createdRecords.push(created);
      } catch (rowErr) {
        errorRows.push(`Row #${i + 1} (${String(title).substring(0, 30)}...): ${rowErr.message}`);
      }
    }

    if (createdRecords.length === 0 && errorRows.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No sponsored projects could be imported. Please verify column formatting.',
        errors: errorRows
      });
    }

    await t.commit();

    if (req.user && createdRecords.length > 0) {
      await logAction({
        userId: req.user.id,
        action: 'BULK_CREATE',
        resourceType: 'SponsoredProject',
        details: `Bulk uploaded ${createdRecords.length} sponsored research projects (${errorRows.length} failed rows)`
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${createdRecords.length} sponsored research project(s).`,
      count: createdRecords.length,
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

// @desc    Clear all sponsored projects (with admin check)
// @route   DELETE /api/sponsored-projects/clear-all
// @access  Private (Admin, HOD, Coordinator)
exports.clearAllSponsoredProjects = async (req, res) => {
  try {
    const where = {};
    if (req.user && req.user.role !== 'admin') {
      if (req.user.department && req.user.department !== 'All') {
        where.department = req.user.department;
      }
    }

    const count = await SponsoredProject.destroy({ where });

    if (req.user) {
      await logAction({
        userId: req.user.id,
        action: 'DELETE',
        resourceType: 'SponsoredProject',
        details: `Cleared ${count} sponsored research project records`
      });
    }

    res.json({
      success: true,
      message: `Successfully deleted ${count} sponsored research records.`
    });
  } catch (error) {
    console.error('Clear all sponsored projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear sponsored project records',
      error: error.message
    });
  }
};
