'use strict';

/**
 * Controller for Institutional Analytics and Complete Institutional Reports
 * CHRIST (Deemed to be University) — IQAC Platform
 */

const {
  getInstitutionalAnalytics,
  generateInstitutionalExcelReport,
  generateInstitutionalPdfReport,
  generateInstitutionalWordReport
} = require('../services/institutionalReportService');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { Campus, School, Department, ProgramLevel } = require('../models');

/**
 * GET /api/institutional-analytics/dashboard
 * Live institutional analytics for Dashboard V2.0
 */
exports.getDashboardAnalytics = async (req, res) => {
  try {
    let userScope = {};
    try {
      userScope = await resolveDepartmentScope(req, 'Department', false);
    } catch (scopeErr) {
      // If user has no specific department assigned, let userScope be empty
      userScope = {};
    }

    const filters = {
      campus: req.query.campus,
      school: req.query.school,
      departments: req.query.departments ? (Array.isArray(req.query.departments) ? req.query.departments : req.query.departments.split(',')) : (req.query.department ? [req.query.department] : []),
      academicYears: req.query.academicYears ? (Array.isArray(req.query.academicYears) ? req.query.academicYears : req.query.academicYears.split(',')) : (req.query.academicYear ? [req.query.academicYear] : []),
      batch: req.query.batch,
      program: req.query.program,
      indexing: req.query.indexing,
      status: req.query.status
    };

    const data = await getInstitutionalAnalytics(filters, userScope);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to load institutional analytics.'
    });
  }
};

/**
 * GET /api/institutional-analytics/report-config
 * Configuration metadata for Complete Institutional Report Generator modal
 */
exports.getReportConfig = async (req, res) => {
  try {
    const [campuses, schools, departments, programLevels] = await Promise.all([
      Campus ? Campus.findAll({ attributes: ['id', 'name'], raw: true }).catch(() => []) : [],
      School ? School.findAll({ attributes: ['id', 'name', 'campusId'], raw: true }).catch(() => []) : [],
      Department ? Department.findAll({ attributes: ['id', 'name', 'shortName', 'schoolId'], raw: true }).catch(() => []) : [],
      ProgramLevel ? ProgramLevel.findAll({ attributes: ['id', 'name'], raw: true }).catch(() => []) : []
    ]);

    const academicYears = [
      'AY 2026–27',
      'AY 2025–26',
      'AY 2024–25',
      'AY 2023–24',
      'AY 2022–23',
      'AY 2021–22',
      'AY 2020–21'
    ];
    const reportLevels = [
      { id: 'summary', name: 'Summary Report', description: 'Executive indicators, core KPIs across all 5 sections, methodology & data quality indicators.' },
      { id: 'analytical', name: 'Analytical Report', description: 'All 5 sections, multi-year comparisons, department comparisons, and analytical breakdown tables.' },
      { id: 'detailed', name: 'Detailed Report', description: 'Comprehensive comparative tables, department breakdowns, methodology, data quality notes, and optional supporting source records.' }
    ];

    const exportFormats = [
      { id: 'excel', label: 'Microsoft Excel (.xlsx)', extension: 'xlsx' },
      { id: 'pdf', label: 'Adobe PDF (.pdf)', extension: 'pdf' },
      { id: 'word', label: 'Microsoft Word (.docx)', extension: 'docx' }
    ];

    return res.json({
      success: true,
      data: {
        academicYears,
        defaultAcademicYears: ['AY 2026–27', 'AY 2025–26', 'AY 2024–25', 'AY 2023–24'],
        campuses: campuses.map(c => ({ id: c.id, name: c.name })),
        schools: schools.map(s => ({ id: s.id, name: s.name, campusId: s.campusId })),
        departments: departments.map(d => ({ id: d.id, name: d.name, shortName: d.shortName, schoolId: d.schoolId })),
        programLevels: programLevels.map(p => ({ id: p.id, name: p.name })),
        reportLevels,
        exportFormats
      }
    });
  } catch (error) {
    console.error('Error fetching report config:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve report configuration options.'
    });
  }
};

/**
 * POST /api/institutional-analytics/preview
 * Generate live report preview for the modal
 */
exports.previewReport = async (req, res) => {
  try {
    let userScope = {};
    try {
      userScope = await resolveDepartmentScope(req, 'Department', false);
    } catch (e) {
      userScope = {};
    }

    const {
      campus,
      school,
      departments,
      academicYears,
      reportLevel = 'summary',
      includeSourceBreakdown = false,
      batch,
      program,
      indexing,
      status
    } = req.body;

    const filters = {
      campus,
      school,
      departments,
      academicYears,
      batch,
      program,
      indexing,
      status
    };

    const reportData = await getInstitutionalAnalytics(filters, userScope);

    return res.json({
      success: true,
      preview: {
        ...reportData,
        reportLevel,
        includeSourceBreakdown
      }
    });
  } catch (error) {
    console.error('Error generating report preview:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to generate report preview.'
    });
  }
};

/**
 * POST /api/institutional-analytics/export
 * Download report in Excel, PDF, or Word
 */
exports.exportReport = async (req, res) => {
  try {
    let userScope = {};
    try {
      userScope = await resolveDepartmentScope(req, 'Department', false);
    } catch (e) {
      userScope = {};
    }

    const {
      format = 'excel',
      reportLevel = 'summary',
      includeSourceBreakdown = false,
      campus,
      school,
      departments,
      academicYears,
      batch,
      program,
      indexing,
      status
    } = req.body;

    const filters = {
      campus,
      school,
      departments,
      academicYears,
      batch,
      program,
      indexing,
      status
    };

    const reportData = await getInstitutionalAnalytics(filters, userScope);
    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeLevel = (reportLevel || 'summary').toUpperCase();

    if (format === 'excel' || format === 'xlsx') {
      const buffer = await generateInstitutionalExcelReport({
        reportData,
        reportLevel,
        includeSourceBreakdown: Boolean(includeSourceBreakdown)
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="CHRIST_IQAC_Institutional_Report_${safeLevel}_${dateStamp}.xlsx"`);
      return res.send(buffer);
    } else if (format === 'pdf') {
      const buffer = generateInstitutionalPdfReport({
        reportData,
        reportLevel,
        includeSourceBreakdown: Boolean(includeSourceBreakdown)
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="CHRIST_IQAC_Institutional_Report_${safeLevel}_${dateStamp}.pdf"`);
      return res.send(buffer);
    } else if (format === 'word' || format === 'docx') {
      const buffer = await generateInstitutionalWordReport({
        reportData,
        reportLevel,
        includeSourceBreakdown: Boolean(includeSourceBreakdown)
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="CHRIST_IQAC_Institutional_Report_${safeLevel}_${dateStamp}.docx"`);
      return res.send(buffer);
    } else {
      return res.status(400).json({
        success: false,
        message: `Unsupported export format: ${format}. Supported formats: 'excel', 'pdf', 'word'.`
      });
    }
  } catch (error) {
    console.error('Error exporting institutional report:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to export report document.'
    });
  }
};
