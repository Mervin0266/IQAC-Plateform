'use strict';

/**
 * Professional Excel (.xlsx) Report Builder for Research & Innovation Reports
 * CHRIST University IQAC Platform
 *
 * Generates official, publication-grade Microsoft Excel (.xlsx) workbooks with:
 * - Embedded official CHRIST University logo
 * - One consolidated main worksheet named 'Research & Innovation Report'
 * - Institutional color palette (Slate Blue #1C355B, Primary Blue #2855B9, Pale Blue #E7EEF9)
 * - Strict UNIFORM styling across all Academic Year columns (No latest-year highlight!)
 * - Formatted Indian currency (INR) retaining numeric cell types
 * - Properly wrapped Amount in Words and Methodology Notes (no overflow or clipping)
 * - Landscape print setup with fitted margins and visible gridlines
 * - Optional 'Contributing Records' appendix sheet
 */

const ExcelJS = require('exceljs');
const { getLogoBuffer } = require('./logoHelper');
const { sanitizeSpreadsheetCell } = require('./spreadsheetSanitizer');

// Institutional Color Palette (ARGB for ExcelJS)
const ARGB_SLATE_BLUE = 'FF1C355B';
const ARGB_PRIMARY_BLUE = 'FF2855B9';
const ARGB_PALE_BLUE = 'FFE7EEF9';
const ARGB_CARD_BG = 'FFF8FAFC';
const ARGB_BORDER_GRAY = 'FFCBD5E1';
const ARGB_BORDER_LIGHT = 'FFE2E8F0';
const ARGB_TEXT_DARK = 'FF1E293B';
const ARGB_TEXT_MUTED = 'FF64748B';
const ARGB_WHITE = 'FFFFFFFF';
const ARGB_GREEN_DARK = 'FF166534';

const THIN_BORDER = {
  top: { style: 'thin', color: { argb: ARGB_BORDER_GRAY } },
  bottom: { style: 'thin', color: { argb: ARGB_BORDER_GRAY } },
  left: { style: 'thin', color: { argb: ARGB_BORDER_GRAY } },
  right: { style: 'thin', color: { argb: ARGB_BORDER_GRAY } }
};

const NOTE_BORDER = {
  top: { style: 'thin', color: { argb: ARGB_BORDER_LIGHT } },
  bottom: { style: 'thin', color: { argb: ARGB_BORDER_LIGHT } },
  left: { style: 'thin', color: { argb: ARGB_BORDER_LIGHT } },
  right: { style: 'thin', color: { argb: ARGB_BORDER_LIGHT } }
};

/**
 * Builds a professional Excel workbook buffer from report data.
 * @param {Object} options
 * @param {Object} options.reportData - Validated centralized report data
 * @param {boolean} options.includeSourceBreakdown - Whether to add 'Contributing Records' sheet
 * @returns {Promise<Buffer>} Excel workbook (.xlsx) buffer
 */
async function buildResearchReportExcel({
  reportData,
  includeSourceBreakdown = false
}) {
  const {
    scopeDisplay = 'University-wide',
    periods = [],
    sections = [],
    statuses = {},
    generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    iprMetrics = null,
    sponsoredMetrics = null,
    consultancyMetrics = null,
    sourceRecords = []
  } = reportData;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'CHRIST (Deemed to be University) - IQAC';
  wb.lastModifiedBy = 'CHRIST IQAC Platform';
  wb.created = new Date();
  wb.modified = new Date();

  // --- SHEET 1: RESEARCH & INNOVATION REPORT (Consolidated Main Worksheet) ---
  const ws = wb.addWorksheet('Research & Innovation Report', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3
      }
    },
    views: [{ showGridLines: true }]
  });

  const numCols = 1 + periods.length;
  const lastColLetter = String.fromCharCode(64 + Math.min(numCols, 26));

  // Set column widths
  ws.getColumn(1).width = 46;
  for (let i = 2; i <= numCols; i++) {
    ws.getColumn(i).width = 25;
  }

  // 1. EMBED OFFICIAL LOGO
  const logoBuf = getLogoBuffer();
  if (logoBuf) {
    try {
      const logoId = wb.addImage({
        buffer: logoBuf,
        extension: 'png'
      });
      ws.addImage(logoId, {
        tl: { col: 0.15, row: 0.15 },
        ext: { width: 130, height: 44 }
      });
    } catch (imgErr) {
      console.warn('[ExcelReportBuilder] Notice: Could not embed logo image:', imgErr.message);
    }
  }

  // 2. REPORT HEADER (Rows 1 - 3)
  const titleRow1 = ws.getRow(1);
  titleRow1.height = 24;
  ws.mergeCells(`A1:${lastColLetter}1`);
  const cellA1 = ws.getCell('A1');
  cellA1.value = 'CHRIST (DEEMED TO BE UNIVERSITY)';
  cellA1.font = { name: 'Arial', size: 14, bold: true, color: { argb: ARGB_SLATE_BLUE } };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };

  const titleRow2 = ws.getRow(2);
  titleRow2.height = 20;
  ws.mergeCells(`A2:${lastColLetter}2`);
  const cellA2 = ws.getCell('A2');
  cellA2.value = 'INTERNAL QUALITY ASSURANCE CELL (IQAC)';
  cellA2.font = { name: 'Arial', size: 11, bold: true, color: { argb: ARGB_PRIMARY_BLUE } };
  cellA2.alignment = { horizontal: 'center', vertical: 'middle' };

  const titleRow3 = ws.getRow(3);
  titleRow3.height = 24;
  ws.mergeCells(`A3:${lastColLetter}3`);
  const cellA3 = ws.getCell('A3');
  cellA3.value = 'RESEARCH & INNOVATION ANNUAL CONSOLIDATED REPORT';
  cellA3.font = { name: 'Arial', size: 12, bold: true, color: { argb: ARGB_SLATE_BLUE } };
  cellA3.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.getRow(4).height = 8; // Spacer

  // 3. METADATA BLOCK (Rows 5 - 6)
  const statusSummaryText = [];
  if (sections.includes('ipr') && statuses.ipr) {
    statusSummaryText.push(`IPR: ${statuses.ipr.join(', ')}`);
  }
  if (sections.includes('sponsored') && statuses.sponsored) {
    statusSummaryText.push(`Sponsored: ${statuses.sponsored.join(', ')}`);
  }
  if (sections.includes('consultancy') && statuses.consultancy) {
    statusSummaryText.push(`Consultancy: ${statuses.consultancy.join(', ')}`);
  }

  const metaRow1 = ws.getRow(5);
  metaRow1.height = 20;
  ws.mergeCells(`A5:${lastColLetter}5`);
  const cellA5 = ws.getCell('A5');
  cellA5.value = `Reporting Scope: ${scopeDisplay}    |    Generated On: ${generatedAt}`;
  cellA5.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: ARGB_TEXT_DARK } };
  cellA5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ARGB_CARD_BG } };
  cellA5.alignment = { horizontal: 'center', vertical: 'middle' };
  cellA5.border = NOTE_BORDER;

  const metaRow2 = ws.getRow(6);
  metaRow2.height = 20;
  ws.mergeCells(`A6:${lastColLetter}6`);
  const cellA6 = ws.getCell('A6');
  cellA6.value = `Selected Academic Years: ${periods.map(p => p.ayLabel).join(', ')}    |    Approval Statuses: ${statusSummaryText.join(' | ') || 'All Approved Records'}`;
  cellA6.font = { name: 'Arial', size: 9, italic: true, color: { argb: ARGB_TEXT_MUTED } };
  cellA6.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ARGB_CARD_BG } };
  cellA6.alignment = { horizontal: 'center', vertical: 'middle' };
  cellA6.border = NOTE_BORDER;

  ws.getRow(7).height = 12; // Spacer

  let currentRowIdx = 8;

  // HELPER: Add Section Banner
  function addSectionBanner(titleText) {
    const row = ws.getRow(currentRowIdx);
    row.height = 26;
    ws.mergeCells(`A${currentRowIdx}:${lastColLetter}${currentRowIdx}`);
    const cell = ws.getCell(`A${currentRowIdx}`);
    cell.value = titleText;
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: ARGB_SLATE_BLUE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ARGB_PALE_BLUE } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    cell.border = THIN_BORDER;
    currentRowIdx++;
  }

  // HELPER: Add Table Header Row (Uniform AY column styling)
  function addTableHeaderRow() {
    const row = ws.getRow(currentRowIdx);
    row.height = 26;

    // Col A
    const cellA = row.getCell(1);
    cellA.value = 'Metric / Particulars';
    cellA.font = { name: 'Arial', size: 10, bold: true, color: { argb: ARGB_WHITE } };
    cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ARGB_SLATE_BLUE } };
    cellA.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    cellA.border = THIN_BORDER;

    // AY Columns (UNIFORM styling for all years)
    periods.forEach((p, idx) => {
      const cell = row.getCell(2 + idx);
      cell.value = p.ayLabel;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: ARGB_WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ARGB_SLATE_BLUE } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = THIN_BORDER;
    });

    currentRowIdx++;
  }

  // HELPER: Add Metric Data Row
  function addDataRow(metricLabel, values, isFinancial = false, isIndent = false) {
    const row = ws.getRow(currentRowIdx);
    row.height = isIndent ? 42 : 23; // Adequate height for amount in words

    const cellA = row.getCell(1);
    cellA.value = metricLabel;
    cellA.font = {
      name: 'Arial',
      size: isIndent ? 9 : 10,
      bold: !isIndent,
      italic: isIndent,
      color: { argb: isIndent ? ARGB_TEXT_MUTED : ARGB_TEXT_DARK }
    };
    cellA.alignment = { horizontal: 'left', vertical: isIndent ? 'top' : 'middle', indent: isIndent ? 2 : 1 };
    cellA.border = THIN_BORDER;

    periods.forEach((p, idx) => {
      const cell = row.getCell(2 + idx);
      const val = values[idx];

      if (isIndent) {
        // Amount in words
        cell.value = String(val ?? '—');
        cell.font = { name: 'Arial', size: 9, italic: true, color: { argb: ARGB_TEXT_DARK } };
        cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      } else if (isFinancial) {
        // Financial Amount in INR (preserve numeric value with currency format)
        if (typeof val === 'number') {
          cell.value = val;
          cell.numFmt = '"₹"#,##,##0';
        } else {
          cell.value = val !== null && val !== undefined ? String(val) : '—';
        }
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: ARGB_GREEN_DARK } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        // Numeric Count
        cell.value = typeof val === 'number' ? val : (val !== null && val !== undefined ? String(val) : 0);
        if (typeof val === 'number') {
          cell.numFmt = '#,##0';
        }
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: ARGB_TEXT_DARK } };
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }

      cell.border = THIN_BORDER;
    });

    currentRowIdx++;
  }

  // HELPER: Add Methodology Note
  function addMethodologyNote(noteText) {
    const row = ws.getRow(currentRowIdx);
    row.height = 36;
    ws.mergeCells(`A${currentRowIdx}:${lastColLetter}${currentRowIdx}`);
    const cell = ws.getCell(`A${currentRowIdx}`);
    cell.value = `* Methodology Note: ${noteText}`;
    cell.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: ARGB_TEXT_MUTED } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ARGB_CARD_BG } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
    cell.border = NOTE_BORDER;
    currentRowIdx++;

    ws.getRow(currentRowIdx).height = 10; // Spacer
    currentRowIdx++;
  }

  // 4. SECTION 1: IPR DETAILS
  if (sections.includes('ipr') && iprMetrics) {
    addSectionBanner('1. IPR Details (Patents & Intellectual Property)');
    addTableHeaderRow();
    addDataRow(
      'Number of Patents Published',
      periods.map(p => iprMetrics.publishedByPeriod[p.key] ?? 0)
    );
    addDataRow(
      'Number of Patents Granted',
      periods.map(p => iprMetrics.grantedByPeriod[p.key] ?? 0)
    );
    ws.getRow(currentRowIdx).height = 10;
    currentRowIdx++;
  }

  // 5. SECTION 2: SPONSORED RESEARCH DETAILS
  if (sections.includes('sponsored') && sponsoredMetrics) {
    const secNum = sections.includes('ipr') ? '2' : '1';
    addSectionBanner(`${secNum}. Sponsored Research Details (Research Grants & Seed Money)`);
    addTableHeaderRow();
    addDataRow(
      'Total Sponsored Projects',
      periods.map(p => sponsoredMetrics.projectsByPeriod[p.key] ?? 0)
    );
    addDataRow(
      'Total Funding Agencies',
      periods.map(p => sponsoredMetrics.agenciesByPeriod[p.key] ?? 0)
    );
    addDataRow(
      'Total Amount Received (INR)',
      periods.map(p => sponsoredMetrics.amountByPeriod[p.key] ?? 0),
      true
    );
    addDataRow(
      '↳ Amount in Words',
      periods.map(p => sponsoredMetrics.amountInWordsByPeriod[p.key] ?? '—'),
      false,
      true
    );
    addMethodologyNote(
      'Total Amount Received reflects sum of sanctioned funding amounts in accordance with IQAC reporting guidelines. Total Funding Agencies reflects distinct funding agencies.'
    );
  }

  // 6. SECTION 3: CONSULTANCY PROJECT DETAILS
  if (sections.includes('consultancy') && consultancyMetrics) {
    let num = 1;
    if (sections.includes('ipr')) num++;
    if (sections.includes('sponsored')) num++;
    addSectionBanner(`${num}. Consultancy Project Details (Advisory & Commercial Projects)`);
    addTableHeaderRow();
    addDataRow(
      'Total Consultancy Projects',
      periods.map(p => consultancyMetrics.projectsByPeriod[p.key] ?? 0)
    );
    addDataRow(
      'Total Client Organizations',
      periods.map(p => consultancyMetrics.agenciesByPeriod[p.key] ?? 0)
    );
    addDataRow(
      'Total Amount Received (INR)',
      periods.map(p => consultancyMetrics.amountByPeriod[p.key] ?? 0),
      true
    );
    addDataRow(
      '↳ Amount in Words',
      periods.map(p => consultancyMetrics.amountInWordsByPeriod[p.key] ?? '—'),
      false,
      true
    );
    addMethodologyNote(
      'Total Amount Received reflects sum of contract values (in Lakhs converted to INR) in accordance with IQAC reporting guidelines. Total Client Organizations reflects distinct client organizations.'
    );
  }

  // 7. SHEET 2: OPTIONAL CONTRIBUTING RECORDS BREAKDOWN
  if (includeSourceBreakdown && sourceRecords && sourceRecords.length > 0) {
    const sourceWs = wb.addWorksheet('Contributing Records', {
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      },
      views: [{ showGridLines: true }]
    });

    const sourceHeaders = [
      'Section',
      'Metric',
      'Reporting Period',
      'Source Record ID',
      'Record Title / Project Name',
      'Department',
      'Approval Status',
      'Relevant Organization',
      'Source Amount',
      'Converted Amount (INR)',
      'Inclusion Reason'
    ];

    const sHeaderRow = sourceWs.getRow(1);
    sHeaderRow.height = 24;
    sourceHeaders.forEach((h, idx) => {
      const cell = sHeaderRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: ARGB_WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ARGB_SLATE_BLUE } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = THIN_BORDER;
    });

    sourceWs.getColumn(1).width = 18;
    sourceWs.getColumn(2).width = 24;
    sourceWs.getColumn(3).width = 15;
    sourceWs.getColumn(4).width = 24;
    sourceWs.getColumn(5).width = 40;
    sourceWs.getColumn(6).width = 25;
    sourceWs.getColumn(7).width = 16;
    sourceWs.getColumn(8).width = 28;
    sourceWs.getColumn(9).width = 18;
    sourceWs.getColumn(10).width = 22;
    sourceWs.getColumn(11).width = 32;

    sourceRecords.forEach((r, rIdx) => {
      const row = sourceWs.getRow(2 + rIdx);
      row.height = 20;
      const vals = [
        r.section,
        r.metric,
        r.period,
        r.sourceId,
        r.title,
        r.department,
        r.status,
        r.agency,
        r.amountSource || '—',
        r.amountFormatted || '—',
        r.note
      ];

      vals.forEach((val, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        cell.value = sanitizeSpreadsheetCell(val);
        cell.font = { name: 'Arial', size: 9, color: { argb: ARGB_TEXT_DARK } };
        cell.alignment = {
          horizontal: cIdx >= 8 && cIdx <= 9 ? 'right' : 'left',
          vertical: 'middle'
        };
        cell.border = THIN_BORDER;
        if (rIdx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ARGB_CARD_BG } };
        }
      });
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  buildResearchReportExcel
};
