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
const {
  getFacultyDirectory,
  calculateReportAnalytics,
  generateReportBuilderExport
} = require('../services/institutionalReportBuilderService');
const {
  getIprDashboardAnalytics,
  getIprDrilldownRecords
} = require('../services/iprAnalyticsService');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { Campus, School, Department, ProgramLevel, SavedReportConfig, ReportHistory } = require('../models');
const { Op } = require('sequelize');

// Filter-aware multi-key in-memory cache for dashboard analytics (TTL: 60 seconds)
const dashboardAnalyticsCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

function buildFilterCacheKey(filters, userScope) {
  const normDepts = [...(filters.departments || [])].sort().join('|');
  const normAys = [...(filters.academicYears || [])].sort().join('|');
  const scopeId = userScope?.departmentId || userScope?.departmentName || 'all';
  return [
    filters.campus || 'all',
    filters.school || 'all',
    normDepts || 'all',
    normAys || 'all',
    filters.batch || 'all',
    filters.program || 'all',
    filters.indexing || 'all',
    filters.status || 'all',
    scopeId
  ].join('::');
}

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

    const cacheKey = buildFilterCacheKey(filters, userScope);
    const cached = dashboardAnalyticsCache.get(cacheKey);
    const now = Date.now();

    // Return fresh cached result if within TTL
    if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return res.json({
        success: true,
        data: cached.data,
        cached: true,
        cacheAgeMs: now - cached.timestamp
      });
    }

    try {
      const data = await getInstitutionalAnalytics(filters, userScope);
      dashboardAnalyticsCache.set(cacheKey, { data, timestamp: now });
      return res.json({
        success: true,
        data,
        cached: false
      });
    } catch (fetchErr) {
      if (cached) {
        console.warn('Analytics compute error, returning cached fallback:', fetchErr.message);
        return res.json({
          success: true,
          data: cached.data,
          cached: true,
          staleFallback: true
        });
      }
      throw fetchErr;
    }
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

/**
 * GET /api/institutional-analytics/ipr
 * Authoritative server-side IPR (Patents & Copyrights) Analytics
 */
exports.getIprAnalytics = async (req, res) => {
  try {
    const data = await getIprDashboardAnalytics(req.query, req.user);
    return res.json(data);
  } catch (error) {
    console.error('Error fetching IPR analytics:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve IPR analytics.'
    });
  }
};

/**
 * GET /api/institutional-analytics/ipr/drilldown
 * Interactive IPR Drill-down source records
 */
exports.getIprDrilldown = async (req, res) => {
  try {
    const data = await getIprDrilldownRecords(req.query, req.user);
    return res.json(data);
  } catch (error) {
    console.error('Error fetching IPR drilldown records:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve IPR drill-down records.'
    });
  }
};

/**
 * GET /api/institutional-analytics/faculty-directory
 * Returns verified faculty directory within scope for Report Builder global faculty filter
 */
exports.getFacultyDirectory = async (req, res) => {
  try {
    const scopeConfig = {
      campuses: req.query.campuses ? (Array.isArray(req.query.campuses) ? req.query.campuses : req.query.campuses.split(',')) : (req.query.campus ? [req.query.campus] : []),
      schools: req.query.schools ? (Array.isArray(req.query.schools) ? req.query.schools : req.query.schools.split(',')) : (req.query.school ? [req.query.school] : []),
      departments: req.query.departments ? (Array.isArray(req.query.departments) ? req.query.departments : req.query.departments.split(',')) : (req.query.department ? [req.query.department] : [])
    };
    const data = await getFacultyDirectory(scopeConfig);
    return res.json(data);
  } catch (error) {
    console.error('Error fetching faculty directory:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve faculty directory.'
    });
  }
};

/**
 * POST /api/institutional-analytics/builder-preview
 * Full multi-page interactive preview for the Institutional Report Builder
 */
exports.builderPreview = async (req, res) => {
  try {
    let userScope = {};
    try {
      userScope = await resolveDepartmentScope(req, 'Department', false);
    } catch (e) {
      userScope = {};
    }

    const reportData = await calculateReportAnalytics(req.body, userScope, req.user);
    return res.json({
      success: true,
      reportData
    });
  } catch (error) {
    console.error('Error generating report builder preview:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to generate report preview.'
    });
  }
};

/**
 * POST /api/institutional-analytics/builder-export
 * Generate official PDF or Word (.docx) institutional report
 */
exports.builderExport = async (req, res) => {
  try {
    let userScope = {};
    try {
      userScope = await resolveDepartmentScope(req, 'Department', false);
    } catch (e) {
      userScope = {};
    }

    const { buffer, filename, contentType, reportData } = await generateReportBuilderExport(req.body, userScope, req.user);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Error generating report builder export:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to generate export document.'
    });
  }
};

/**
 * GET /api/institutional-analytics/saved-configs
 * Returns saved report configurations for current user (or shared)
 */
exports.getSavedConfigs = async (req, res) => {
  try {
    const where = req.user
      ? { [Op.or]: [{ createdBy: req.user.id }, { isShared: true }] }
      : {};
    const configs = SavedReportConfig ? await SavedReportConfig.findAll({
      where,
      order: [['updatedAt', 'DESC']]
    }) : [];
    return res.json({
      success: true,
      configs
    });
  } catch (error) {
    console.error('Error fetching saved report configs:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load saved report configurations.'
    });
  }
};

/**
 * POST /api/institutional-analytics/saved-configs
 * Create or update a saved report configuration
 */
exports.saveConfig = async (req, res) => {
  try {
    const { id, name, description, reportType, outputFormat, scopeConfig, contentConfig, comparisonConfig, stylingConfig, isShared } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Configuration name is required.' });
    }

    let config;
    if (id) {
      config = await SavedReportConfig.findByPk(id);
      if (config) {
        await config.update({
          name,
          description,
          reportType,
          outputFormat,
          scopeConfig,
          contentConfig,
          comparisonConfig,
          stylingConfig,
          isShared: Boolean(isShared)
        });
      }
    }

    if (!config) {
      config = await SavedReportConfig.create({
        name,
        description,
        reportType,
        outputFormat,
        scopeConfig,
        contentConfig,
        comparisonConfig,
        stylingConfig,
        isShared: Boolean(isShared),
        createdBy: req.user ? req.user.id : null
      });
    }

    return res.json({
      success: true,
      config,
      message: 'Configuration successfully saved.'
    });
  } catch (error) {
    console.error('Error saving report config:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save configuration.'
    });
  }
};

/**
 * DELETE /api/institutional-analytics/saved-configs/:id
 * Delete a saved report configuration
 */
exports.deleteSavedConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await SavedReportConfig.findByPk(id);
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found.' });
    }
    // Verify ownership or admin
    if (req.user && config.createdBy && config.createdBy !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'system_admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this configuration.' });
    }
    await config.destroy();
    return res.json({ success: true, message: 'Configuration successfully deleted.' });
  } catch (error) {
    console.error('Error deleting report config:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete configuration.'
    });
  }
};

/**
 * GET /api/institutional-analytics/history
 * Returns report generation history
 */
exports.getReportHistory = async (req, res) => {
  try {
    const where = req.user ? { createdBy: req.user.id } : {};
    const history = ReportHistory ? await ReportHistory.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50
    }) : [];
    return res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching report history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load report history.'
    });
  }
};

/**
 * DELETE /api/institutional-analytics/history/:id
 * Delete report history item
 */
exports.deleteReportHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await ReportHistory.findByPk(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Report record not found.' });
    }
    if (req.user && item.createdBy && item.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this record.' });
    }
    await item.destroy();
    return res.json({ success: true, message: 'Report history record deleted.' });
  } catch (error) {
    console.error('Error deleting report history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete report history record.'
    });
  }
};

// ══════════════════════════════════════════════════════════════════
// Institutional Analytics Platform — Dynamic Engine Endpoints
// ══════════════════════════════════════════════════════════════════

const {
  METRIC_DOMAINS,
  METRIC_CATALOG,
  executeAnalyticsQuery,
  executeComparisonQuery,
  getDataGovernanceMetrics,
  evaluateCustomFormula
} = require('../services/customAnalyticsService');
const { CustomDashboard, CustomMetric, AnalyticsPreset } = require('../models');

/**
 * GET /api/institutional-analytics/metric-catalog
 */
exports.getMetricCatalog = async (req, res) => {
  try {
    const customList = CustomMetric ? await CustomMetric.findAll({
      order: [['createdAt', 'DESC']]
    }).catch(() => []) : [];

    return res.json({
      success: true,
      domains: METRIC_DOMAINS,
      catalog: METRIC_CATALOG,
      customMetrics: customList
    });
  } catch (error) {
    console.error('Error loading metric catalog:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve metric catalog.'
    });
  }
};

/**
 * POST /api/institutional-analytics/query
 */
exports.queryAnalytics = async (req, res) => {
  try {
    const result = await executeAnalyticsQuery(req.body, req.user);
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error executing analytics query:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute analytics query.'
    });
  }
};

/**
 * POST /api/institutional-analytics/compare
 */
exports.compareAnalytics = async (req, res) => {
  try {
    const result = await executeComparisonQuery(req.body);
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error executing comparison query:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute comparison.'
    });
  }
};

/**
 * GET /api/institutional-analytics/governance
 */
exports.getGovernanceData = async (req, res) => {
  try {
    const result = await getDataGovernanceMetrics(req.query);
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching governance data:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load data governance metrics.'
    });
  }
};

/**
 * Custom Dashboards CRUD
 */
exports.getCustomDashboards = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const dashboards = CustomDashboard ? await CustomDashboard.findAll({
      where: {
        [Op.or]: [
          ...(userId ? [{ createdBy: userId }] : []),
          { isPublic: true },
          { isTemplate: true }
        ]
      },
      order: [['isTemplate', 'DESC'], ['updatedAt', 'DESC']]
    }).catch(() => []) : [];

    return res.json({ success: true, dashboards });
  } catch (error) {
    console.error('Error fetching custom dashboards:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboards.' });
  }
};

exports.createCustomDashboard = async (req, res) => {
  try {
    const { title, description, layout, filters, isPublic, isTemplate, category } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Dashboard title is required.' });
    }

    const newDash = await CustomDashboard.create({
      title: title.trim(),
      description,
      layout: layout || [],
      filters: filters || {},
      isPublic: !!isPublic,
      isTemplate: !!isTemplate,
      category: category || 'General',
      createdBy: req.user ? req.user.id : null
    });

    return res.status(201).json({ success: true, dashboard: newDash });
  } catch (error) {
    console.error('Error creating custom dashboard:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to save dashboard.' });
  }
};

exports.updateCustomDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const dashboard = await CustomDashboard.findByPk(id);
    if (!dashboard) {
      return res.status(404).json({ success: false, message: 'Dashboard not found.' });
    }

    const { title, description, layout, filters, isPublic, category } = req.body;
    if (title) dashboard.title = title.trim();
    if (description !== undefined) dashboard.description = description;
    if (layout) dashboard.layout = layout;
    if (filters) dashboard.filters = filters;
    if (isPublic !== undefined) dashboard.isPublic = !!isPublic;
    if (category) dashboard.category = category;

    await dashboard.save();
    return res.json({ success: true, dashboard });
  } catch (error) {
    console.error('Error updating custom dashboard:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update dashboard.' });
  }
};

exports.deleteCustomDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const dashboard = await CustomDashboard.findByPk(id);
    if (!dashboard) {
      return res.status(404).json({ success: false, message: 'Dashboard not found.' });
    }
    await dashboard.destroy();
    return res.json({ success: true, message: 'Dashboard deleted successfully.' });
  } catch (error) {
    console.error('Error deleting custom dashboard:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete dashboard.' });
  }
};

/**
 * Custom Metrics CRUD
 */
exports.createCustomMetric = async (req, res) => {
  try {
    const { name, code, description, formula, domain, unit, format } = req.body;
    if (!name || !formula || !domain) {
      return res.status(400).json({ success: false, message: 'Name, domain, and formula are required.' });
    }

    const newMetric = await CustomMetric.create({
      name: name.trim(),
      code: code || name.toUpperCase().replace(/\s+/g, '_'),
      description,
      formula: formula.trim(),
      domain,
      unit: unit || 'units',
      format: format || 'number',
      isSystem: false,
      createdBy: req.user ? req.user.id : null
    });

    return res.status(201).json({ success: true, metric: newMetric });
  } catch (error) {
    console.error('Error creating custom metric:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to save custom metric.' });
  }
};

exports.deleteCustomMetric = async (req, res) => {
  try {
    const { id } = req.params;
    const metric = await CustomMetric.findByPk(id);
    if (!metric) {
      return res.status(404).json({ success: false, message: 'Metric not found.' });
    }
    if (metric.isSystem) {
      return res.status(403).json({ success: false, message: 'System metrics cannot be deleted.' });
    }
    await metric.destroy();
    return res.json({ success: true, message: 'Metric deleted successfully.' });
  } catch (error) {
    console.error('Error deleting metric:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete metric.' });
  }
};

