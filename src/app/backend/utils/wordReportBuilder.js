'use strict';

/**
 * Microsoft Word (.docx) Report Builder for Research & Innovation Reports
 * CHRIST University IQAC Platform
 *
 * Generates official, native editable Microsoft Word (.docx) documents with:
 * - Embedded official CHRIST University logo
 * - Official institutional color palette (Slate Blue #1C355B, Primary Blue #2855B9, Pale Blue #E7EEF9)
 * - Native editable Word tables with uniform Academic Year column styling
 * - Wrapped Amount in Words and Methodology Notes
 * - Header, Footer, and Page Numbers
 * - Optional Supporting Source Records Breakdown Appendix
 */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  ImageRun,
  PageOrientation,
  Footer,
  PageNumber
} = require('docx');
const { getLogoBuffer } = require('./logoHelper');
const { formatIndianCurrency } = require('./indianCurrencyHelper');

// Institutional Color Palette (Hex without # for docx)
const COLOR_SLATE_BLUE = '1C355B';
const COLOR_PRIMARY_BLUE = '2855B9';
const COLOR_PALE_BLUE = 'E7EEF9';
const COLOR_BORDER_GRAY = 'CBD5E1';
const COLOR_CARD_BG = 'F8FAFC';
const COLOR_TEXT_MUTED = '64748B';
const COLOR_TEXT_DARK = '1E293B';
const COLOR_WHITE = 'FFFFFF';
const COLOR_GREEN_DARK = '166534';

const THIN_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: COLOR_BORDER_GRAY
};

const TABLE_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
  insideHorizontal: THIN_BORDER,
  insideVertical: THIN_BORDER
};

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'auto'
};

const CARD_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER
};

/**
 * Builds a native Microsoft Word (.docx) document buffer from report data.
 * @param {Object} options
 * @param {Object} options.reportData - Validated centralized report data
 * @param {boolean} options.includeSourceBreakdown - Whether to append source records appendix
 * @returns {Promise<Buffer>} Word document (.docx) buffer
 */
async function buildResearchReportWord({
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

  const docChildren = [];
  const logoBuf = getLogoBuffer();

  // 1. INSTITUTIONAL HEADER & LOGO
  if (logoBuf) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [
          new ImageRun({
            data: logoBuf,
            transformation: {
              width: 140,
              height: 47
            }
          })
        ]
      })
    );
  }

  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({
          text: 'CHRIST (DEEMED TO BE UNIVERSITY)',
          bold: true,
          size: 28, // 14pt
          color: COLOR_SLATE_BLUE,
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 20, after: 40 },
      children: [
        new TextRun({
          text: 'INTERNAL QUALITY ASSURANCE CELL (IQAC)',
          bold: true,
          size: 22, // 11pt
          color: COLOR_PRIMARY_BLUE,
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 20, after: 160 },
      children: [
        new TextRun({
          text: 'RESEARCH & INNOVATION ANNUAL CONSOLIDATED REPORT',
          bold: true,
          size: 24, // 12pt
          color: COLOR_SLATE_BLUE,
          font: 'Arial'
        })
      ]
    })
  );

  // 2. METADATA SUMMARY CARD
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

  const metaRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: CARD_BORDERS,
          shading: { type: ShadingType.CLEAR, fill: COLOR_CARD_BG },
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          children: [
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: 'Reporting Scope: ', bold: true, size: 18, color: COLOR_TEXT_DARK, font: 'Arial' }),
                new TextRun({ text: scopeDisplay, size: 18, color: COLOR_TEXT_DARK, font: 'Arial' })
              ]
            }),
            new Paragraph({
              spacing: { after: 0 },
              children: [
                new TextRun({ text: 'Selected Academic Years: ', bold: true, size: 18, color: COLOR_TEXT_DARK, font: 'Arial' }),
                new TextRun({ text: periods.map(p => p.ayLabel).join(', '), size: 18, color: COLOR_TEXT_DARK, font: 'Arial' })
              ]
            })
          ]
        }),
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: CARD_BORDERS,
          shading: { type: ShadingType.CLEAR, fill: COLOR_CARD_BG },
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          children: [
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: 'Generated On: ', bold: true, size: 18, color: COLOR_TEXT_DARK, font: 'Arial' }),
                new TextRun({ text: generatedAt, size: 18, color: COLOR_TEXT_DARK, font: 'Arial' })
              ]
            }),
            new Paragraph({
              spacing: { after: 0 },
              children: [
                new TextRun({ text: 'Approval Statuses: ', bold: true, size: 18, color: COLOR_TEXT_DARK, font: 'Arial' }),
                new TextRun({ text: statusSummaryText.join(' | ') || 'All Approved Records', size: 18, color: COLOR_TEXT_DARK, font: 'Arial' })
              ]
            })
          ]
        })
      ]
    })
  ];

  docChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: CARD_BORDERS,
      rows: metaRows
    }),
    new Paragraph({ spacing: { before: 180, after: 0 }, children: [] })
  );

  // HELPER: Table Column Header Generator (Uniform AY column styling)
  const numPeriods = periods.length;
  const colMetricWidth = Math.max(34, 100 - (numPeriods * 16));
  const colAyWidth = (100 - colMetricWidth) / (numPeriods || 1);

  function createTableHeaderRow() {
    return new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: colMetricWidth, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: COLOR_SLATE_BLUE },
          borders: TABLE_BORDERS,
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: 'Metric / Particulars',
                  bold: true,
                  size: 19,
                  color: COLOR_WHITE,
                  font: 'Arial'
                })
              ]
            })
          ]
        }),
        ...periods.map(p =>
          new TableCell({
            width: { size: colAyWidth, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: COLOR_SLATE_BLUE },
            borders: TABLE_BORDERS,
            margins: { top: 120, bottom: 120, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: p.ayLabel,
                    bold: true,
                    size: 19,
                    color: COLOR_WHITE,
                    font: 'Arial'
                  })
                ]
              })
            ]
          })
        )
      ]
    });
  }

  function createDataRow(label, values, isFinancial = false, isIndent = false) {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: colMetricWidth, type: WidthType.PERCENTAGE },
          borders: TABLE_BORDERS,
          shading: { type: ShadingType.CLEAR, fill: COLOR_WHITE },
          margins: { top: 90, bottom: 90, left: isIndent ? 240 : 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: label,
                  bold: !isIndent,
                  size: isIndent ? 17 : 19,
                  color: isIndent ? COLOR_TEXT_MUTED : COLOR_TEXT_DARK,
                  font: 'Arial'
                })
              ]
            })
          ]
        }),
        ...values.map(val =>
          new TableCell({
            width: { size: colAyWidth, type: WidthType.PERCENTAGE },
            borders: TABLE_BORDERS,
            shading: { type: ShadingType.CLEAR, fill: COLOR_WHITE },
            margins: { top: 90, bottom: 90, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: isIndent ? AlignmentType.LEFT : AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: typeof val === 'number'
                      ? (isFinancial ? formatIndianCurrency(val) : String(val))
                      : String(val ?? '—'),
                    bold: !isIndent && typeof val === 'number',
                    italics: isIndent,
                    size: isIndent ? 16 : 19,
                    color: isFinancial ? COLOR_GREEN_DARK : (isIndent ? COLOR_TEXT_MUTED : COLOR_TEXT_DARK),
                    font: 'Arial'
                  })
                ]
              })
            ]
          })
        )
      ]
    });
  }

  function createMethodologyBox(noteText) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: CARD_BORDERS,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: CARD_BORDERS,
              shading: { type: ShadingType.CLEAR, fill: COLOR_CARD_BG },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '* Methodology Note: ',
                      bold: true,
                      italics: true,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial'
                    }),
                    new TextRun({
                      text: noteText,
                      italics: true,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial'
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    });
  }

  function createSectionHeading(titleText) {
    return new Paragraph({
      spacing: { before: 240, after: 100 },
      children: [
        new TextRun({
          text: titleText,
          bold: true,
          size: 22, // 11pt
          color: COLOR_SLATE_BLUE,
          font: 'Arial'
        })
      ]
    });
  }

  // 3. SECTION 1: IPR DETAILS
  if (sections.includes('ipr') && iprMetrics) {
    docChildren.push(createSectionHeading('1. IPR Details (Patents & Intellectual Property)'));
    const iprRows = [
      createTableHeaderRow(),
      createDataRow(
        'Number of Patents Published',
        periods.map(p => iprMetrics.publishedByPeriod[p.key] ?? 0)
      ),
      createDataRow(
        'Number of Patents Granted',
        periods.map(p => iprMetrics.grantedByPeriod[p.key] ?? 0)
      )
    ];

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows: iprRows
      })
    );
  }

  // 4. SECTION 2: SPONSORED RESEARCH DETAILS
  if (sections.includes('sponsored') && sponsoredMetrics) {
    const secNum = sections.includes('ipr') ? '2' : '1';
    docChildren.push(createSectionHeading(`${secNum}. Sponsored Research Details (Research Grants & Seed Money)`));

    const spRows = [
      createTableHeaderRow(),
      createDataRow(
        'Total Sponsored Projects',
        periods.map(p => sponsoredMetrics.projectsByPeriod[p.key] ?? 0)
      ),
      createDataRow(
        'Total Funding Agencies',
        periods.map(p => sponsoredMetrics.agenciesByPeriod[p.key] ?? 0)
      ),
      createDataRow(
        'Total Amount Received (INR)',
        periods.map(p => sponsoredMetrics.amountByPeriod[p.key] ?? 0),
        true
      ),
      createDataRow(
        '↳ Amount in Words',
        periods.map(p => sponsoredMetrics.amountInWordsByPeriod[p.key] ?? '—'),
        false,
        true
      )
    ];

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows: spRows
      }),
      new Paragraph({ spacing: { before: 60, after: 40 }, children: [] }),
      createMethodologyBox(
        'Total Amount Received reflects sum of sanctioned funding amounts in accordance with IQAC reporting guidelines. Total Funding Agencies reflects distinct funding agencies.'
      )
    );
  }

  // 5. SECTION 3: CONSULTANCY PROJECT DETAILS
  if (sections.includes('consultancy') && consultancyMetrics) {
    let num = 1;
    if (sections.includes('ipr')) num++;
    if (sections.includes('sponsored')) num++;
    docChildren.push(createSectionHeading(`${num}. Consultancy Project Details (Advisory & Commercial Projects)`));

    const cRows = [
      createTableHeaderRow(),
      createDataRow(
        'Total Consultancy Projects',
        periods.map(p => consultancyMetrics.projectsByPeriod[p.key] ?? 0)
      ),
      createDataRow(
        'Total Client Organizations',
        periods.map(p => consultancyMetrics.agenciesByPeriod[p.key] ?? 0)
      ),
      createDataRow(
        'Total Amount Received (INR)',
        periods.map(p => consultancyMetrics.amountByPeriod[p.key] ?? 0),
        true
      ),
      createDataRow(
        '↳ Amount in Words',
        periods.map(p => consultancyMetrics.amountInWordsByPeriod[p.key] ?? '—'),
        false,
        true
      )
    ];

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows: cRows
      }),
      new Paragraph({ spacing: { before: 60, after: 40 }, children: [] }),
      createMethodologyBox(
        'Total Amount Received reflects sum of contract values (in Lakhs converted to INR) in accordance with IQAC reporting guidelines. Total Client Organizations reflects distinct client organizations.'
      )
    );
  }

  // 6. APPENDIX: CONTRIBUTING SOURCE RECORDS BREAKDOWN (Optional)
  if (includeSourceBreakdown && sourceRecords && sourceRecords.length > 0) {
    docChildren.push(
      new Paragraph({
        pageBreakBefore: true,
        spacing: { before: 200, after: 120 },
        children: [
          new TextRun({
            text: 'APPENDIX: CONTRIBUTING SOURCE RECORDS BREAKDOWN',
            bold: true,
            size: 24,
            color: COLOR_SLATE_BLUE,
            font: 'Arial'
          })
        ]
      })
    );

    const appendixHeaders = [
      'Section',
      'Metric',
      'Period',
      'Record Title / Project Name',
      'Department',
      'Status',
      'Organization / Agency',
      'Source Amount',
      'Converted Amount (INR)',
      'Inclusion Reason'
    ];

    const appendixRows = [
      new TableRow({
        tableHeader: true,
        children: appendixHeaders.map(h =>
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: COLOR_SLATE_BLUE },
            borders: TABLE_BORDERS,
            margins: { top: 90, bottom: 90, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: h,
                    bold: true,
                    size: 16,
                    color: COLOR_WHITE,
                    font: 'Arial'
                  })
                ]
              })
            ]
          })
        )
      }),
      ...sourceRecords.map(r =>
        new TableRow({
          children: [
            r.section,
            r.metric,
            r.period,
            r.title,
            r.department,
            r.status,
            r.agency,
            r.amountSource || '—',
            r.amountFormatted || '—',
            r.note
          ].map((val, cellIdx) =>
            new TableCell({
              borders: TABLE_BORDERS,
              margins: { top: 70, bottom: 70, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: cellIdx >= 7 && cellIdx <= 8 ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: String(val ?? '—'),
                      size: 15,
                      color: COLOR_TEXT_DARK,
                      font: 'Arial'
                    })
                  ]
                })
              ]
            })
          )
        })
      )
    ];

    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows: appendixRows
      })
    );
  }

  // 7. BUILD WORD DOCUMENT WITH LANDSCAPE LAYOUT & FOOTER
  const doc = new Document({
    title: 'CHRIST IQAC Research & Innovation Report',
    creator: 'CHRIST (Deemed to be University) - IQAC',
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE
            },
            margin: {
              top: 720, // 0.5 in
              bottom: 720,
              left: 720,
              right: 720
            }
          }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.BOTH,
                children: [
                  new TextRun({
                    text: 'CHRIST (Deemed to be University) | Internal Quality Assurance Cell (IQAC)',
                    size: 16,
                    color: COLOR_TEXT_MUTED,
                    font: 'Arial'
                  }),
                  new TextRun({
                    text: '\t\tPage ',
                    size: 16,
                    color: COLOR_TEXT_MUTED,
                    font: 'Arial'
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: COLOR_TEXT_MUTED,
                    font: 'Arial'
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 16,
                    color: COLOR_TEXT_MUTED,
                    font: 'Arial'
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: COLOR_TEXT_MUTED,
                    font: 'Arial'
                  })
                ]
              })
            ]
          })
        },
        children: docChildren
      }
    ]
  });

  return await Packer.toBuffer(doc);
}

module.exports = {
  buildResearchReportWord
};
