'use strict';

/**
 * Research & Innovation Report Controller
 * CHRIST University IQAC Platform
 */

const researchReportService = require('../services/researchReportService');

/**
 * GET /api/research-reports/config
 * Retrieves dynamic reporting options, periods, scopes, and section statuses.
 */
exports.getReportConfig = async (req, res) => {
  try {
    const config = await researchReportService.getReportConfigOptions(req.user);
    return res.status(200).json({
      success: true,
      data: config
    });
  } catch (err) {
    console.error('Failed to retrieve report configuration:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve report configuration options: ' + err.message
    });
  }
};

/**
 * POST /api/research-reports/preview
 * Generates aggregated comparative figures, warnings, and preview data.
 */
exports.previewReport = async (req, res) => {
  try {
    const {
      sections,
      periods,
      statuses,
      scope,
      department,
      includeSourceBreakdown
    } = req.body;

    // Validation: At least one section required
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one report section must be selected (IPR, Sponsored Research, or Consultancy).'
      });
    }

    // Validation: At least one reporting period required
    if (!periods || !Array.isArray(periods) || periods.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one reporting period must be selected.'
      });
    }

    // Validation: At least one approval status per selected section
    if (statuses && typeof statuses === 'object') {
      for (const sec of sections) {
        if (statuses[sec] && Array.isArray(statuses[sec]) && statuses[sec].length === 0) {
          return res.status(400).json({
            success: false,
            message: `At least one approval status must be selected for ${sec.toUpperCase()} section.`
          });
        }
      }
    }

    const reportData = await researchReportService.generateReportData({
      sections,
      periods,
      statuses,
      scope: scope || 'university',
      department,
      user: req.user,
      includeSourceBreakdown: !!includeSourceBreakdown
    });

    return res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (err) {
    console.error('Failed to generate report preview:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report preview: ' + err.message
    });
  }
};

/**
 * POST /api/research-reports/export
 * Generates and downloads Excel (.xlsx) or PDF (.pdf) report file.
 */
exports.exportReport = async (req, res) => {
  try {
    const {
      sections,
      periods,
      statuses,
      scope,
      department,
      format = 'excel',
      includeSourceBreakdown = false
    } = req.body;

    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one report section must be selected.'
      });
    }

    if (!periods || !Array.isArray(periods) || periods.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one reporting period must be selected.'
      });
    }

    const reportData = await researchReportService.generateReportData({
      sections,
      periods,
      statuses,
      scope: scope || 'university',
      department,
      user: req.user,
      includeSourceBreakdown: !!includeSourceBreakdown
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'pdf') {
      const pdfBuffer = researchReportService.generatePdfReport(reportData, !!includeSourceBreakdown);
      const filename = `CHRIST_IQAC_Research_Report_${timestamp}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.status(200).send(pdfBuffer);
    } else if (format === 'word' || format === 'docx') {
      const wordBuffer = await researchReportService.generateWordReport(reportData, !!includeSourceBreakdown);
      const filename = `CHRIST_IQAC_Research_Report_${timestamp}.docx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', wordBuffer.length);
      return res.status(200).send(wordBuffer);
    } else {
      // Default to Excel
      const excelBuffer = await researchReportService.generateExcelReport(reportData, !!includeSourceBreakdown);
      const filename = `CHRIST_IQAC_Research_Report_${timestamp}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      return res.status(200).send(excelBuffer);
    }
  } catch (err) {
    console.error('Failed to export research report:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to export research report: ' + err.message
    });
  }
};

