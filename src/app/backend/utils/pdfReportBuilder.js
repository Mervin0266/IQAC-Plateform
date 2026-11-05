'use strict';

/**
 * Pure Node.js Standard PDF 1.4 Builder for Research & Innovation Reports
 * CHRIST University IQAC Platform
 * 
 * Generates self-contained, valid PDF 1.4 documents without third-party dependencies.
 * Supports multi-page tables, headers, footers, pagination, and styling.
 */

function escapePdfText(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/₹/g, 'Rs. ')
    .replace(/–/g, '-')
    .replace(/—/g, '--');
}

/**
 * Creates a PDF document buffer from report data.
 * @param {Object} options - Report data and rendering options
 * @returns {Buffer} PDF buffer
 */
function buildResearchReportPdf({
  reportData,
  includeSourceBreakdown = false
}) {
  const {
    scopeDisplay = 'University-wide',
    periods = [],
    sections = [],
    generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    iprMetrics = null,
    sponsoredMetrics = null,
    consultancyMetrics = null,
    sourceRecords = []
  } = reportData;

  const isLandscape = periods.length > 3;
  const pageWidth = isLandscape ? 841.89 : 595.28;
  const pageHeight = isLandscape ? 595.28 : 841.89;
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2);

  const pages = [];
  let currentPageOps = [];
  let currentY = pageHeight - margin;

  function newPage() {
    if (currentPageOps.length > 0) {
      pages.push(currentPageOps.join('\n'));
    }
    currentPageOps = [];
    currentY = pageHeight - margin;
  }

  function checkSpace(neededHeight) {
    if (currentY - neededHeight < margin + 30) {
      newPage();
      renderPageHeader();
    }
  }

  function rect(x, y, w, h, fillRgb, strokeRgb) {
    let s = '';
    if (fillRgb) {
      s += `${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} rg `;
    }
    if (strokeRgb) {
      s += `${strokeRgb[0]} ${strokeRgb[1]} ${strokeRgb[2]} RG `;
    }
    s += `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re `;
    if (fillRgb && strokeRgb) s += 'B\n';
    else if (fillRgb) s += 'f\n';
    else if (strokeRgb) s += 'S\n';
    currentPageOps.push(s);
  }

  function text(str, x, y, font = 'F1', size = 9, colorRgb = [0.1, 0.1, 0.1]) {
    const esc = escapePdfText(str);
    const s = `${colorRgb[0]} ${colorRgb[1]} ${colorRgb[2]} rg BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc}) Tj ET`;
    currentPageOps.push(s);
  }

  function renderPageHeader() {
    // Header top band
    rect(margin, currentY - 2, contentWidth, 2, [0.16, 0.33, 0.73], null); // #2855B9
    currentY -= 8;
  }

  // --- START COVER / HEADER BLOCK ---
  renderPageHeader();

  // Institution title
  text('CHRIST (DEEMED TO BE UNIVERSITY)', margin, currentY - 14, 'F2', 15, [0.11, 0.21, 0.36]); // #1C355B
  currentY -= 20;
  text('INTERNAL QUALITY ASSURANCE CELL (IQAC)', margin, currentY - 10, 'F2', 10, [0.16, 0.33, 0.73]);
  currentY -= 16;
  text('RESEARCH & INNOVATION ANNUAL CONSOLIDATED REPORT', margin, currentY - 10, 'F2', 11, [0.2, 0.25, 0.35]);
  currentY -= 18;

  // Metadata Box
  const metaBoxHeight = 32;
  rect(margin, currentY - metaBoxHeight, contentWidth, metaBoxHeight, [0.96, 0.97, 0.99], [0.85, 0.88, 0.92]);
  
  const periodLabels = periods.map(p => p.ayLabel || p.label || p.key).join(', ');
  text(`Scope: ${scopeDisplay}`, margin + 8, currentY - 14, 'F2', 8.5, [0.2, 0.25, 0.35]);
  text(`Reporting Periods: ${periodLabels}`, margin + 8, currentY - 26, 'F1', 8, [0.35, 0.4, 0.45]);
  text(`Generated: ${generatedAt}`, margin + contentWidth - 180, currentY - 14, 'F1', 8, [0.35, 0.4, 0.45]);
  currentY -= (metaBoxHeight + 16);

  // Helper for dynamic table rendering
  function renderComparativeTable(title, rows, note = null) {
    checkSpace(80);

    // Section Title
    text(title, margin, currentY - 10, 'F2', 11, [0.11, 0.21, 0.36]);
    currentY -= 18;

    const numCols = periods.length;
    const labelColWidth = isLandscape ? 260 : 200;
    const periodColWidth = (contentWidth - labelColWidth) / numCols;

    // Header Row
    const headerHeight = 22;
    rect(margin, currentY - headerHeight, contentWidth, headerHeight, [0.16, 0.33, 0.73], [0.16, 0.33, 0.73]);
    text('Metric / Particulars', margin + 8, currentY - 15, 'F2', 8.5, [1, 1, 1]);

    periods.forEach((p, idx) => {
      const colX = margin + labelColWidth + (idx * periodColWidth);
      const colLabel = p.ayLabel || p.label || p.key;
      text(colLabel, colX + 8, currentY - 15, 'F2', 8.5, [1, 1, 1]);
    });
    currentY -= headerHeight;

    // Rows
    rows.forEach((row, rowIdx) => {
      const isAlt = rowIdx % 2 === 1;
      const isWordsRow = !!row.isWordsRow;
      const rowHeight = isWordsRow ? 20 : 22;

      checkSpace(rowHeight + 10);

      const bg = isWordsRow
        ? [0.98, 0.98, 0.99]
        : (isAlt ? [0.95, 0.96, 0.98] : [1, 1, 1]);

      rect(margin, currentY - rowHeight, contentWidth, rowHeight, bg, [0.85, 0.88, 0.92]);

      const labelFont = isWordsRow ? 'F1' : (row.isTotal ? 'F2' : 'F1');
      const labelColor = isWordsRow ? [0.4, 0.45, 0.5] : [0.15, 0.2, 0.25];
      const labelSize = isWordsRow ? 7.5 : 8.5;

      text(row.label, margin + (isWordsRow ? 18 : 8), currentY - (rowHeight * 0.65), labelFont, labelSize, labelColor);

      periods.forEach((p, idx) => {
        const colX = margin + labelColWidth + (idx * periodColWidth);
        const cellVal = row.values[p.key] !== undefined ? String(row.values[p.key]) : '—';
        const valFont = isWordsRow ? 'F1' : (row.isTotal ? 'F2' : 'F1');
        const valSize = isWordsRow ? 7.5 : 8.5;
        const valColor = isWordsRow ? [0.35, 0.4, 0.5] : [0.1, 0.15, 0.2];
        text(cellVal, colX + 8, currentY - (rowHeight * 0.65), valFont, valSize, valColor);
      });

      currentY -= rowHeight;
    });

    if (note) {
      currentY -= 4;
      text(note, margin + 4, currentY - 8, 'F1', 7.5, [0.45, 0.5, 0.55]);
      currentY -= 14;
    } else {
      currentY -= 12;
    }
  }

  // --- SECTION 1: IPR DETAILS ---
  if (sections.includes('ipr') && iprMetrics) {
    const rows = [
      {
        label: 'Number of Patents Published',
        values: iprMetrics.publishedByPeriod || {}
      },
      {
        label: 'Number of Patents Granted',
        values: iprMetrics.grantedByPeriod || {}
      }
    ];
    renderComparativeTable('1. IPR Details (Patents & Intellectual Property)', rows);
  }

  // --- SECTION 2: SPONSORED RESEARCH DETAILS ---
  if (sections.includes('sponsored') && sponsoredMetrics) {
    const secTitle = sections.includes('ipr')
      ? '2. Sponsored Research Details (Research Grants & Seed Money)'
      : '1. Sponsored Research Details (Research Grants & Seed Money)';

    const rows = [
      {
        label: 'Total Sponsored Projects',
        values: sponsoredMetrics.projectsByPeriod || {}
      },
      {
        label: 'Total Funding Agencies',
        values: sponsoredMetrics.agenciesByPeriod || {}
      },
      {
        label: 'Total Amount Received (INR)',
        isTotal: true,
        values: sponsoredMetrics.amountFormattedByPeriod || {}
      },
      {
        label: '↳ Amount in Words',
        isWordsRow: true,
        values: sponsoredMetrics.amountInWordsByPeriod || {}
      }
    ];
    const note = '* Note: Total Amount Received reflects sum of sanctioned funding amounts in accordance with IQAC reporting guidelines.';
    renderComparativeTable(secTitle, rows, note);
  }

  // --- SECTION 3: CONSULTANCY PROJECT DETAILS ---
  if (sections.includes('consultancy') && consultancyMetrics) {
    let num = 1;
    if (sections.includes('ipr')) num++;
    if (sections.includes('sponsored')) num++;
    const secTitle = `${num}. Consultancy Project Details (Advisory & Commercial Projects)`;

    const rows = [
      {
        label: 'Total Consultancy Projects',
        values: consultancyMetrics.projectsByPeriod || {}
      },
      {
        label: 'Total Client Organizations',
        values: consultancyMetrics.agenciesByPeriod || {}
      },
      {
        label: 'Total Amount Received (INR)',
        isTotal: true,
        values: consultancyMetrics.amountFormattedByPeriod || {}
      },
      {
        label: '↳ Amount in Words',
        isWordsRow: true,
        values: consultancyMetrics.amountInWordsByPeriod || {}
      }
    ];
    const note = '* Note: Total Amount Received reflects sum of contract values (in Lakhs converted to INR) in accordance with IQAC reporting guidelines.';
    renderComparativeTable(secTitle, rows, note);
  }

  // --- OPTIONAL SOURCE BREAKDOWN APPENDIX ---
  if (includeSourceBreakdown && sourceRecords && sourceRecords.length > 0) {
    newPage();
    renderPageHeader();
    text('APPENDIX: CONTRIBUTING SOURCE RECORDS BREAKDOWN', margin, currentY - 12, 'F2', 12, [0.11, 0.21, 0.36]);
    currentY -= 20;

    const colWidths = isLandscape
      ? [70, 70, 60, 160, 90, 80, 80, 70, 80]
      : [50, 50, 45, 120, 70, 60, 60, 50, 60];

    const headers = ['Section', 'Metric', 'Period', 'Title / Project', 'Dept', 'Status', 'Agency', 'Amount', 'Note'];
    const hHeight = 18;

    rect(margin, currentY - hHeight, contentWidth, hHeight, [0.16, 0.33, 0.73], null);
    let curX = margin;
    headers.forEach((h, i) => {
      text(h, curX + 4, currentY - 12, 'F2', 7.5, [1, 1, 1]);
      curX += colWidths[i] || 60;
    });
    currentY -= hHeight;

    sourceRecords.slice(0, 100).forEach((rec, idx) => {
      checkSpace(18);
      const isAlt = idx % 2 === 1;
      const rHeight = 16;
      rect(margin, currentY - rHeight, contentWidth, rHeight, isAlt ? [0.96, 0.97, 0.99] : [1, 1, 1], [0.88, 0.9, 0.93]);

      const vals = [
        rec.section || '—',
        rec.metric || '—',
        rec.period || '—',
        (rec.title || '—').slice(0, isLandscape ? 30 : 20),
        (rec.department || '—').slice(0, 14),
        rec.status || '—',
        (rec.agency || '—').slice(0, 14),
        rec.amountFormatted || '—',
        (rec.note || 'Included').slice(0, 14)
      ];

      let cellX = margin;
      vals.forEach((v, i) => {
        text(v, cellX + 4, currentY - 11, 'F1', 6.5, [0.2, 0.2, 0.25]);
        cellX += colWidths[i] || 60;
      });

      currentY -= rHeight;
    });

    if (sourceRecords.length > 100) {
      currentY -= 10;
      text(`* Truncated: Displaying top 100 of ${sourceRecords.length} contributing records. Full source breakdown available in Excel export.`, margin, currentY - 8, 'F1', 7.5, [0.45, 0.5, 0.55]);
      currentY -= 14;
    }
  }

  // Push final page ops
  if (currentPageOps.length > 0) {
    pages.push(currentPageOps.join('\n'));
  }

  // --- COMPOSE FINAL PDF WITH NUMBERED PAGES & FOOTERS ---
  const totalPages = pages.length;
  const pdfObjects = [];

  function addObj(content) {
    pdfObjects.push(content);
    return pdfObjects.length;
  }

  // 1: Catalog
  // 2: Pages root
  // 3: Font Helvetica
  // 4: Font Helvetica-Bold
  const catalogIdx = 1;
  const pagesRootIdx = 2;
  const fontF1Idx = 3;
  const fontF2Idx = 4;

  const fontF1 = `${fontF1Idx} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`;
  const fontF2 = `${fontF2Idx} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`;

  // Reserve page object indices
  const pageIndices = [];
  const contentIndices = [];
  let nextObjId = 5;

  for (let p = 0; p < totalPages; p++) {
    pageIndices.push(nextObjId++);
    contentIndices.push(nextObjId++);
  }

  const catalog = `${catalogIdx} 0 obj\n<< /Type /Catalog /Pages ${pagesRootIdx} 0 R >>\nendobj`;
  const kidsStr = pageIndices.map(id => `${id} 0 R`).join(' ');
  const pagesRoot = `${pagesRootIdx} 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>\nendobj`;

  const assembledObjects = [catalog, pagesRoot, fontF1, fontF2];

  for (let p = 0; p < totalPages; p++) {
    const pageId = pageIndices[p];
    const contentId = contentIndices[p];
    const pageNum = p + 1;

    // Add footer to page content
    const footerY = margin - 15;
    const footerOps = [
      pages[p],
      // Bottom divider
      `0.85 0.88 0.92 RG ${margin} ${footerY + 12} m ${pageWidth - margin} ${footerY + 12} l S`,
      // Footer text
      `0.45 0.5 0.55 rg BT /F1 7.5 Tf ${margin} ${footerY} Td (CHRIST (Deemed to be University) | Internal Quality Assurance Cell (IQAC)) Tj ET`,
      `0.45 0.5 0.55 rg BT /F2 7.5 Tf ${pageWidth - margin - 70} ${footerY} Td (Page ${pageNum} of ${totalPages}) Tj ET`
    ].join('\n');

    const contentLen = Buffer.byteLength(footerOps, 'latin1');
    const contentObj = `${contentId} 0 obj\n<< /Length ${contentLen} >>\nstream\n${footerOps}\nendstream\nendobj`;

    const pageObj = `${pageId} 0 obj\n<< /Type /Page /Parent ${pagesRootIdx} 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /Font << /F1 ${fontF1Idx} 0 R /F2 ${fontF2Idx} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj`;

    assembledObjects.push(pageObj);
    assembledObjects.push(contentObj);
  }

  // Serialize PDF buffer with precise xref table
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  let body = '';
  const offsets = [0];
  let curOffset = Buffer.byteLength(header, 'latin1');

  for (let i = 0; i < assembledObjects.length; i++) {
    offsets.push(curOffset);
    const objStr = assembledObjects[i] + '\n';
    body += objStr;
    curOffset += Buffer.byteLength(objStr, 'latin1');
  }

  const startXref = curOffset;
  let xref = `xref\n0 ${assembledObjects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= assembledObjects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${assembledObjects.length + 1} /Root ${catalogIdx} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.concat([
    Buffer.from(header, 'latin1'),
    Buffer.from(body, 'latin1'),
    Buffer.from(xref, 'latin1'),
    Buffer.from(trailer, 'latin1')
  ]);
}

module.exports = {
  buildResearchReportPdf,
  escapePdfText
};

