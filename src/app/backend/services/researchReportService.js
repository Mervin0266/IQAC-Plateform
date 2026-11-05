'use strict';

/**
 * Centralized Research & Innovation Report Service (V1.5)
 * CHRIST University IQAC Platform
 * 
 * Handles aggregation, validation, financial calculation,
 * and report generation across:
 * 1. Patents & IP (IPR Details)
 * 2. Sponsored Research
 * 3. Consultancy Projects
 */

const { Op } = require('sequelize');
const XLSX = require('xlsx');
const {
  Patent,
  SponsoredProject,
  ConsultancyProject,
  Department
} = require('../models');
const {
  numberToIndianWords,
  formatIndianCurrency,
  normalizeReportingPeriod,
  periodToCYDisplay,
  periodToFYDisplay,
  periodToAYDisplay,
  periodToStartYear,
  dateToAcademicYear
} = require('../utils/indianCurrencyHelper');
const { buildResearchReportPdf } = require('../utils/pdfReportBuilder');
const { sanitizeSpreadsheetCell } = require('../utils/spreadsheetSanitizer');

const DEFAULT_PERIODS = ['2024-25', '2023-24', '2022-23', '2021-22', '2020-21'];
const DEFAULT_SELECTED_PERIODS = ['2024-25', '2023-24', '2022-23'];

const KNOWN_AGENCY_ALIASES = {
  // AICTE
  'all india council for technical education': 'aicte',
  'aicte': 'aicte',
  // DST
  'department of science and technology': 'dst',
  'department of science & technology': 'dst',
  'dept of science and technology': 'dst',
  'dept of science & technology': 'dst',
  'dst': 'dst',
  // SERB
  'science and engineering research board': 'serb',
  'science & engineering research board': 'serb',
  'serb': 'serb',
  // DBT
  'department of biotechnology': 'dbt',
  'dept of biotechnology': 'dbt',
  'dbt': 'dbt',
  // ICMR
  'indian council of medical research': 'icmr',
  'icmr': 'icmr',
  // CSIR
  'council of scientific and industrial research': 'csir',
  'council of scientific & industrial research': 'csir',
  'csir': 'csir',
  // ISRO
  'indian space research organisation': 'isro',
  'indian space research organization': 'isro',
  'isro': 'isro',
  // DRDO
  'defence research and development organisation': 'drdo',
  'defense research and development organization': 'drdo',
  'defence research and development organization': 'drdo',
  'drdo': 'drdo',
  // UGC
  'university grants commission': 'ugc',
  'ugc': 'ugc',
  // MNRE
  'ministry of new and renewable energy': 'mnre',
  'mnre': 'mnre',
  // MeitY
  'ministry of electronics and information technology': 'meity',
  'ministry of electronics & information technology': 'meity',
  'meity': 'meity',
  // MOES
  'ministry of earth sciences': 'moes',
  'moes': 'moes',
  // ICSSR
  'indian council of social science research': 'icssr',
  'icssr': 'icssr',
  // BRNS
  'board of research in nuclear sciences': 'brns',
  'brns': 'brns',
  // BIRAC
  'biotechnology industry research assistance council': 'birac',
  'birac': 'birac'
};

/**
 * Normalizes and canonicalizes a funding agency / organization name conservatively.
 */
function canonicalizeAgencyName(name) {
  if (!name) return '';
  const clean = String(name).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!clean) return '';
  return KNOWN_AGENCY_ALIASES[clean] || clean;
}

const IPR_STATUSES = [
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' }
];

const SPONSORED_STATUSES = [
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' }
];

const CONSULTANCY_STATUSES = [
  { value: 'approved', label: 'Approved' },
  { value: 'finalized', label: 'Finalized' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_coordinator_review', label: 'Under Coordinator Review' },
  { value: 'under_hod_review', label: 'Under HOD Review' },
  { value: 'rejected', label: 'Rejected' }
];

/**
 * Retrieves dynamic reporting periods from the database or standard defaults.
 */
async function discoverReportingPeriods() {
  const periodSet = new Set(DEFAULT_PERIODS);

  try {
    const [patents, sponsored, consultancy] = await Promise.all([
      Patent.findAll({ attributes: ['academicYear', 'publishedDate', 'grantedDate'], raw: true, limit: 100 }),
      SponsoredProject.findAll({ attributes: ['academicYear'], raw: true, limit: 100 }),
      ConsultancyProject.findAll({ attributes: ['year'], raw: true, limit: 100 })
    ]);

    patents.forEach(p => {
      const norm = normalizeReportingPeriod(p.academicYear);
      if (norm) periodSet.add(norm);
      if (p.publishedDate) {
        const pubAY = dateToAcademicYear(p.publishedDate);
        if (pubAY) periodSet.add(pubAY);
      }
      if (p.grantedDate) {
        const grantAY = dateToAcademicYear(p.grantedDate);
        if (grantAY) periodSet.add(grantAY);
      }
    });

    sponsored.forEach(s => {
      const norm = normalizeReportingPeriod(s.academicYear);
      if (norm) periodSet.add(norm);
    });

    consultancy.forEach(c => {
      const norm = normalizeReportingPeriod(c.year);
      if (norm) periodSet.add(norm);
    });
  } catch (err) {
    // If DB is offline or empty during config discovery, retain standard defaults
  }

  // Sort periods newest first
  const sorted = Array.from(periodSet).sort((a, b) => {
    const ya = parseInt(a.split('-')[0], 10) || 0;
    const yb = parseInt(b.split('-')[0], 10) || 0;
    return yb - ya;
  });

  return sorted.map(k => {
    const ay = periodToAYDisplay(k);
    return {
      key: k,
      label: ay,
      ayLabel: ay,
      cyLabel: ay,
      fyLabel: ay,
      startYear: periodToStartYear(k)
    };
  });
}

/**
 * Returns available report configuration options based on user role and permissions.
 */
async function getReportConfigOptions(user) {
  const periods = await discoverReportingPeriods();

  let departments = [];
  try {
    const deptRows = await Department.findAll({
      attributes: ['name', 'code', 'shortName'],
      where: { status: 'Active' },
      order: [['name', 'ASC']],
      raw: true
    });
    departments = deptRows.map(d => d.name);
  } catch (err) {
    departments = [];
  }

  const isPrivileged = user && (user.role === 'admin' || user.role === 'authority');
  const userDept = user ? user.department : null;

  const scopes = [];
  if (isPrivileged) {
    scopes.push({ id: 'university', label: 'University-wide' });
    scopes.push({ id: 'department', label: 'Authorized Department' });
  } else {
    scopes.push({ id: 'department', label: 'Authorized Department' });
  }

  return {
    sections: [
      { id: 'ipr', label: 'IPR Details', default: true },
      { id: 'sponsored', label: 'Sponsored Research Details', default: true },
      { id: 'consultancy', label: 'Consultancy Project Details', default: true }
    ],
    periods,
    defaultPeriods: periods.slice(0, 3).map(p => p.key),
    statuses: {
      ipr: IPR_STATUSES,
      sponsored: SPONSORED_STATUSES,
      consultancy: CONSULTANCY_STATUSES
    },
    defaultStatuses: {
      ipr: ['approved'],
      sponsored: ['approved'],
      consultancy: ['approved', 'finalized']
    },
    scopes,
    defaultScope: isPrivileged ? 'university' : 'department',
    userDepartment: userDept,
    availableDepartments: isPrivileged ? departments : (userDept ? [userDept] : [])
  };
}

/**
 * Normalizes an organization name conservatively for distinct counting.
 */
function normalizeOrgName(name) {
  if (!name) return '';
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Aggregates and calculates research report data.
 */
async function generateReportData({
  sections = ['ipr', 'sponsored', 'consultancy'],
  periods = DEFAULT_SELECTED_PERIODS,
  statuses = {
    ipr: ['approved'],
    sponsored: ['approved'],
    consultancy: ['approved', 'finalized']
  },
  scope = 'university',
  department = null,
  user,
  includeSourceBreakdown = false
}) {
  const isPrivileged = user && (user.role === 'admin' || user.role === 'authority');
  const effectiveScope = isPrivileged ? scope : 'department';
  const effectiveDepartment = isPrivileged
    ? (effectiveScope === 'department' ? department : null)
    : user.department;

  // Build resolved period objects
  const resolvedPeriods = periods.map(pKey => {
    const norm = normalizeReportingPeriod(pKey) || pKey;
    const ay = periodToAYDisplay(norm);
    return {
      key: norm,
      label: ay,
      ayLabel: ay,
      cyLabel: ay,
      fyLabel: ay,
      startYear: periodToStartYear(norm)
    };
  }).sort((a, b) => (b.startYear || 0) - (a.startYear || 0));

  const periodMap = {};
  resolvedPeriods.forEach(p => {
    periodMap[p.key] = p;
  });

  const warnings = [];
  const sourceRecords = [];

  // Scoping text
  let scopeDisplay = 'University-wide';
  if (effectiveScope === 'department') {
    scopeDisplay = effectiveDepartment ? `Department: ${effectiveDepartment}` : 'Authorized Department';
  }

  // --- 1. IPR DETAILS ---
  let iprMetrics = null;
  if (sections.includes('ipr')) {
    const iprWhere = {};
    const selectedIprStatuses = statuses.ipr && statuses.ipr.length > 0 ? statuses.ipr : ['approved'];
    iprWhere.approvalStatus = { [Op.in]: selectedIprStatuses };

    if (effectiveDepartment && effectiveDepartment !== 'All') {
      iprWhere.department = { [Op.iLike]: `%${effectiveDepartment}%` };
    }

    const publishedByPeriod = {};
    const grantedByPeriod = {};
    resolvedPeriods.forEach(p => {
      publishedByPeriod[p.key] = 0;
      grantedByPeriod[p.key] = 0;
    });

    let patents = [];
    try {
      patents = await Patent.findAll({
        where: iprWhere,
        attributes: [
          'id', 'title', 'inventors', 'patentNo', 'applicationNo',
          'status', 'approvalStatus', 'department', 'publishedDate',
          'grantedDate', 'grantYear', 'academicYear'
        ],
        raw: true
      });
    } catch (err) {
      warnings.push(`IPR query error: ${err.message}`);
    }

    patents.forEach(pat => {
      // 1. Patents Published: Event-based Academic Year attribution
      if (pat.publishedDate) {
        const pubAY = dateToAcademicYear(pat.publishedDate);
        if (pubAY && periodMap[pubAY]) {
          publishedByPeriod[pubAY] = (publishedByPeriod[pubAY] || 0) + 1;
          if (includeSourceBreakdown) {
            sourceRecords.push({
              section: 'IPR Details',
              metric: 'Patents Published',
              period: periodMap[pubAY].ayLabel,
              sourceId: pat.id,
              title: pat.title,
              department: pat.department || '—',
              status: pat.approvalStatus || 'approved',
              agency: 'N/A',
              amountSource: null,
              amountFormatted: '—',
              note: `Published on ${pat.publishedDate}`
            });
          }
        }
      } else if (pat.status && pat.status.toLowerCase() === 'published') {
        warnings.push(`Patent "${pat.title}" (ID: ${pat.id}) is marked published but has no publication date to verify academic year attribution. Excluded from published count.`);
      }

      // 2. Patents Granted: Event-based Academic Year attribution
      if (pat.grantedDate) {
        const grantAY = dateToAcademicYear(pat.grantedDate);
        if (grantAY && periodMap[grantAY]) {
          grantedByPeriod[grantAY] = (grantedByPeriod[grantAY] || 0) + 1;
          if (includeSourceBreakdown) {
            sourceRecords.push({
              section: 'IPR Details',
              metric: 'Patents Granted',
              period: periodMap[grantAY].ayLabel,
              sourceId: pat.id,
              title: pat.title,
              department: pat.department || '—',
              status: pat.approvalStatus || 'approved',
              agency: 'N/A',
              amountSource: null,
              amountFormatted: '—',
              note: `Granted on ${pat.grantedDate}`
            });
          }
        }
      } else if (pat.grantYear) {
        // Single calendar grant year without specific grant date is ambiguous
        warnings.push(`Patent "${pat.title}" (ID: ${pat.id}) has single grant year "${pat.grantYear}" without a verified grant date to establish academic year boundaries. Excluded from granted count.`);
      } else if (pat.status && (pat.status.toLowerCase() === 'granted' || pat.status.toLowerCase() === 'commercialized')) {
        warnings.push(`Patent "${pat.title}" (ID: ${pat.id}) is marked ${pat.status} but has no grant date to establish academic year attribution. Excluded from granted count.`);
      }
    });

    iprMetrics = {
      publishedByPeriod,
      grantedByPeriod,
      totalContributingPatents: patents.length
    };
  }

  // --- 2. SPONSORED RESEARCH DETAILS ---
  let sponsoredMetrics = null;
  if (sections.includes('sponsored')) {
    const spWhere = {};
    const selectedSpStatuses = statuses.sponsored && statuses.sponsored.length > 0 ? statuses.sponsored : ['approved'];
    spWhere.approvalStatus = { [Op.in]: selectedSpStatuses };

    if (effectiveDepartment && effectiveDepartment !== 'All') {
      spWhere.department = { [Op.iLike]: `%${effectiveDepartment}%` };
    }

    const projectsByPeriod = {};
    const agenciesSetByPeriod = {};
    const missingAgenciesCountByPeriod = {};
    const amountByPeriod = {};
    const amountFormattedByPeriod = {};
    const amountInWordsByPeriod = {};

    resolvedPeriods.forEach(p => {
      projectsByPeriod[p.key] = 0;
      agenciesSetByPeriod[p.key] = new Set();
      missingAgenciesCountByPeriod[p.key] = 0;
      amountByPeriod[p.key] = 0;
    });

    let sponsoredProjects = [];
    try {
      sponsoredProjects = await SponsoredProject.findAll({
        where: spWhere,
        attributes: [
          'id', 'title', 'principalInvestigator', 'fundingAgency',
          'sanctionedAmount', 'amountReceived', 'status',
          'approvalStatus', 'academicYear', 'sanctionYear', 'department'
        ],
        raw: true
      });
    } catch (err) {
      warnings.push(`Sponsored research query error: ${err.message}`);
    }

    sponsoredProjects.forEach(proj => {
      const periodNorm = normalizeReportingPeriod(proj.academicYear);
      let matchedPeriod = null;

      if (periodNorm && periodMap[periodNorm]) {
        matchedPeriod = periodNorm;
      }

      if (!matchedPeriod) {
        warnings.push(`Sponsored Project "${proj.title}" (ID: ${proj.id}) has unmapped or missing academic year "${proj.academicYear || 'missing'}". Excluded from reporting period totals.`);
        if (includeSourceBreakdown) {
          sourceRecords.push({
            section: 'Sponsored Research',
            metric: 'Unmapped Project',
            period: 'Unassigned',
            sourceId: proj.id,
            title: proj.title,
            department: proj.department || '—',
            status: proj.approvalStatus,
            agency: proj.fundingAgency || '—',
            amountSource: proj.sanctionedAmount,
            amountFormatted: formatIndianCurrency(proj.sanctionedAmount),
            note: 'Excluded: Unmapped reporting academic year'
          });
        }
        return;
      }

      // Valid project contribution
      projectsByPeriod[matchedPeriod] = (projectsByPeriod[matchedPeriod] || 0) + 1;

      // Extract and canonicalize Funding Agency (distinct count calculation)
      const rawAgency = proj.fundingAgency ? String(proj.fundingAgency).trim() : '';
      if (rawAgency) {
        const canonicalAgency = canonicalizeAgencyName(rawAgency);
        if (canonicalAgency) {
          agenciesSetByPeriod[matchedPeriod].add(canonicalAgency);
        }
      } else {
        missingAgenciesCountByPeriod[matchedPeriod] = (missingAgenciesCountByPeriod[matchedPeriod] || 0) + 1;
      }

      // CRITICAL: Total Amount Received = SUM(sanctionedAmount). Do NOT use amountReceived!
      const sanctionedVal = Number(proj.sanctionedAmount);
      if (isNaN(sanctionedVal)) {
        warnings.push(`Sponsored Project "${proj.title}" (ID: ${proj.id}) has invalid sanctioned amount. Treated as missing.`);
      } else {
        amountByPeriod[matchedPeriod] = (amountByPeriod[matchedPeriod] || 0) + sanctionedVal;
      }

      if (includeSourceBreakdown) {
        sourceRecords.push({
          section: 'Sponsored Research',
          metric: 'Sponsored Project Grant',
          period: periodMap[matchedPeriod].ayLabel,
          sourceId: proj.id,
          title: proj.title,
          department: proj.department || '—',
          status: proj.approvalStatus,
          agency: proj.fundingAgency || '—',
          amountSource: proj.sanctionedAmount,
          amountFormatted: formatIndianCurrency(proj.sanctionedAmount),
          note: 'Included (Sanctioned Amount)'
        });
      }
    });

    const agenciesByPeriod = {};
    resolvedPeriods.forEach(p => {
      agenciesByPeriod[p.key] = agenciesSetByPeriod[p.key] ? agenciesSetByPeriod[p.key].size : 0;
      if (missingAgenciesCountByPeriod[p.key] > 0) {
        warnings.push(`${missingAgenciesCountByPeriod[p.key]} eligible Sponsored Research project(s) in ${p.ayLabel} have missing Funding Agency information.`);
      }
      const totalAmt = amountByPeriod[p.key] || 0;
      amountFormattedByPeriod[p.key] = formatIndianCurrency(totalAmt);
      amountInWordsByPeriod[p.key] = numberToIndianWords(totalAmt);
    });

    sponsoredMetrics = {
      projectsByPeriod,
      agenciesByPeriod,
      amountByPeriod,
      amountFormattedByPeriod,
      amountInWordsByPeriod,
      totalContributingProjects: sponsoredProjects.length
    };
  }

  // --- 3. CONSULTANCY PROJECT DETAILS ---
  let consultancyMetrics = null;
  if (sections.includes('consultancy')) {
    const cWhere = {};
    const selectedCStatuses = statuses.consultancy && statuses.consultancy.length > 0
      ? statuses.consultancy
      : ['approved', 'finalized'];
    cWhere.status = { [Op.in]: selectedCStatuses };

    if (effectiveDepartment && effectiveDepartment !== 'All') {
      cWhere.department = { [Op.iLike]: `%${effectiveDepartment}%` };
    }

    const projectsByPeriod = {};
    const agenciesSetByPeriod = {};
    const missingClientsCountByPeriod = {};
    const amountByPeriod = {};
    const amountFormattedByPeriod = {};
    const amountInWordsByPeriod = {};

    resolvedPeriods.forEach(p => {
      projectsByPeriod[p.key] = 0;
      agenciesSetByPeriod[p.key] = new Set();
      missingClientsCountByPeriod[p.key] = 0;
      amountByPeriod[p.key] = 0;
    });

    let consultancyProjects = [];
    try {
      consultancyProjects = await ConsultancyProject.findAll({
        where: cWhere,
        attributes: [
          'id', 'projectName', 'teacherConsultant', 'agencyName',
          'sponsoringAgency', 'year', 'consultancyStartYear',
          'contractValueInLakhs', 'revenueInLakhs', 'amountReceivedInLakhs',
          'projectStatus', 'status', 'department'
        ],
        raw: true
      });
    } catch (err) {
      warnings.push(`Consultancy query error: ${err.message}`);
    }

    consultancyProjects.forEach(proj => {
      const periodNorm = normalizeReportingPeriod(proj.year);
      let matchedPeriod = null;

      if (periodNorm && periodMap[periodNorm]) {
        matchedPeriod = periodNorm;
      }

      // Check for single calendar start year without verified AY range
      if (!matchedPeriod) {
        const singleYear = proj.year || proj.consultancyStartYear;
        warnings.push(`Consultancy Project "${proj.projectName}" (ID: ${proj.id}) has unmapped or single start year "${singleYear || 'missing'}". Excluded from reporting period totals.`);
        if (includeSourceBreakdown) {
          sourceRecords.push({
            section: 'Consultancy Projects',
            metric: 'Unmapped Consultancy',
            period: 'Unassigned',
            sourceId: proj.id,
            title: proj.projectName,
            department: proj.department || '—',
            status: proj.status,
            agency: proj.agencyName || proj.sponsoringAgency || '—',
            amountSource: proj.contractValueInLakhs ? `${proj.contractValueInLakhs} Lakhs` : '—',
            amountFormatted: '—',
            note: 'Excluded: Single start year without verified AY range'
          });
        }
        return;
      }

      // Valid project contribution
      projectsByPeriod[matchedPeriod] = (projectsByPeriod[matchedPeriod] || 0) + 1;

      const clientOrg = proj.agencyName || proj.sponsoringAgency;
      const rawClient = clientOrg ? String(clientOrg).trim() : '';
      if (rawClient) {
        const normAgency = canonicalizeAgencyName(rawClient);
        if (normAgency) agenciesSetByPeriod[matchedPeriod].add(normAgency);
      } else {
        missingClientsCountByPeriod[matchedPeriod] = (missingClientsCountByPeriod[matchedPeriod] || 0) + 1;
      }

      // CRITICAL: Total Amount Received = SUM(contractValueInLakhs * 100,000). Do NOT use revenueInLakhs or amountReceivedInLakhs!
      const lakhsVal = proj.contractValueInLakhs !== null && proj.contractValueInLakhs !== undefined
        ? Number(proj.contractValueInLakhs)
        : null;

      if (lakhsVal === null || isNaN(lakhsVal)) {
        warnings.push(`Consultancy Project "${proj.projectName}" (ID: ${proj.id}) has missing/unknown contract value.`);
      } else {
        const inrAmount = Math.round(lakhsVal * 100000 * 100) / 100;
        amountByPeriod[matchedPeriod] = (amountByPeriod[matchedPeriod] || 0) + inrAmount;
      }

      if (includeSourceBreakdown) {
        const sourceAmt = proj.contractValueInLakhs !== null ? `${proj.contractValueInLakhs} Lakhs` : '—';
        const inrAmt = lakhsVal !== null && !isNaN(lakhsVal) ? (lakhsVal * 100000) : null;
        sourceRecords.push({
          section: 'Consultancy Projects',
          metric: 'Consultancy Contract',
          period: periodMap[matchedPeriod].ayLabel,
          sourceId: proj.id,
          title: proj.projectName,
          department: proj.department || '—',
          status: proj.status,
          agency: clientOrg || '—',
          amountSource: sourceAmt,
          amountFormatted: inrAmt !== null ? formatIndianCurrency(inrAmt) : '—',
          note: 'Included (Contract Value converted to INR)'
        });
      }
    });

    const agenciesByPeriod = {};
    resolvedPeriods.forEach(p => {
      agenciesByPeriod[p.key] = agenciesSetByPeriod[p.key] ? agenciesSetByPeriod[p.key].size : 0;
      if (missingClientsCountByPeriod[p.key] > 0) {
        warnings.push(`${missingClientsCountByPeriod[p.key]} eligible Consultancy project(s) in ${p.ayLabel} have missing Client Organization information.`);
      }
      const totalAmt = amountByPeriod[p.key] || 0;
      amountFormattedByPeriod[p.key] = formatIndianCurrency(totalAmt);
      amountInWordsByPeriod[p.key] = numberToIndianWords(totalAmt);
    });

    consultancyMetrics = {
      projectsByPeriod,
      agenciesByPeriod,
      amountByPeriod,
      amountFormattedByPeriod,
      amountInWordsByPeriod,
      totalContributingProjects: consultancyProjects.length
    };
  }

  const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return {
    scope: effectiveScope,
    department: effectiveDepartment,
    scopeDisplay,
    periods: resolvedPeriods,
    sections,
    statuses,
    generatedAt,
    iprMetrics,
    sponsoredMetrics,
    consultancyMetrics,
    warnings,
    isComplete: warnings.length === 0,
    sourceRecords: includeSourceBreakdown ? sourceRecords : []
  };
}

/**
 * Generates Excel Workbook (.xlsx) from report data.
 */
function generateExcelReport(reportData, includeSourceBreakdown = false) {
  const {
    scopeDisplay,
    periods,
    sections,
    generatedAt,
    iprMetrics,
    sponsoredMetrics,
    consultancyMetrics,
    sourceRecords = []
  } = reportData;

  const wb = XLSX.utils.book_new();

  // --- SHEET 1: RESEARCH & INNOVATION REPORT ---
  const reportRows = [
    ['CHRIST (DEEMED TO BE UNIVERSITY)'],
    ['INTERNAL QUALITY ASSURANCE CELL (IQAC)'],
    ['RESEARCH & INNOVATION ANNUAL CONSOLIDATED REPORT'],
    [`Reporting Scope: ${scopeDisplay}`, `Generated On: ${generatedAt}`],
    [`Reporting Periods: ${periods.map(p => p.ayLabel).join(', ')}`],
    [] // Blank divider
  ];

  // Section 1: IPR
  if (sections.includes('ipr') && iprMetrics) {
    reportRows.push(['1. IPR Details (Patents & Intellectual Property)']);
    const ayHeaders = ['Metric / Particulars', ...periods.map(p => p.ayLabel)];
    reportRows.push(ayHeaders);
    reportRows.push([
      'Number of Patents Published',
      ...periods.map(p => iprMetrics.publishedByPeriod[p.key] ?? 0)
    ]);
    reportRows.push([
      'Number of Patents Granted',
      ...periods.map(p => iprMetrics.grantedByPeriod[p.key] ?? 0)
    ]);
    reportRows.push([]);
  }

  // Section 2: Sponsored Research
  if (sections.includes('sponsored') && sponsoredMetrics) {
    const secNum = sections.includes('ipr') ? '2' : '1';
    reportRows.push([`${secNum}. Sponsored Research Details (Research Grants & Seed Money)`]);
    const ayHeaders = ['Metric / Particulars', ...periods.map(p => p.ayLabel)];
    reportRows.push(ayHeaders);
    reportRows.push([
      'Total Sponsored Projects',
      ...periods.map(p => sponsoredMetrics.projectsByPeriod[p.key] ?? 0)
    ]);
    reportRows.push([
      'Total Funding Agencies',
      ...periods.map(p => sponsoredMetrics.agenciesByPeriod[p.key] ?? 0)
    ]);
    reportRows.push([
      'Total Amount Received (INR)',
      ...periods.map(p => sponsoredMetrics.amountByPeriod[p.key] ?? 0)
    ]);
    reportRows.push([
      '↳ Amount in Words',
      ...periods.map(p => sponsoredMetrics.amountInWordsByPeriod[p.key] ?? '—')
    ]);
    reportRows.push([
      '* Methodology Note: Total Amount Received reflects sum of sanctioned funding amounts in accordance with IQAC reporting guidelines. Total Funding Agencies reflects distinct funding agencies.'
    ]);
    reportRows.push([]);
  }

  // Section 3: Consultancy Projects
  if (sections.includes('consultancy') && consultancyMetrics) {
    let num = 1;
    if (sections.includes('ipr')) num++;
    if (sections.includes('sponsored')) num++;
    reportRows.push([`${num}. Consultancy Project Details (Advisory & Commercial Projects)`]);
    const ayHeaders = ['Metric / Particulars', ...periods.map(p => p.ayLabel)];
    reportRows.push(ayHeaders);
    reportRows.push([
      'Total Consultancy Projects',
      ...periods.map(p => consultancyMetrics.projectsByPeriod[p.key] ?? 0)
    ]);
    reportRows.push([
      'Total Client Organizations',
      ...periods.map(p => consultancyMetrics.agenciesByPeriod[p.key] ?? 0)
    ]);
    reportRows.push([
      'Total Amount Received (INR)',
      ...periods.map(p => consultancyMetrics.amountByPeriod[p.key] ?? 0)
    ]);
    reportRows.push([
      '↳ Amount in Words',
      ...periods.map(p => consultancyMetrics.amountInWordsByPeriod[p.key] ?? '—')
    ]);
    reportRows.push([
      '* Methodology Note: Total Amount Received reflects sum of contract values (in Lakhs converted to INR) in accordance with IQAC reporting guidelines. Total Client Organizations reflects distinct client organizations.'
    ]);
    reportRows.push([]);
  }

  // Sanitize all cells against formula injection (CWE-1236)
  const sanitizedReportRows = reportRows.map(row => row.map(sanitizeSpreadsheetCell));
  const reportWs = XLSX.utils.aoa_to_sheet(sanitizedReportRows);

  // Set column widths
  reportWs['!cols'] = [
    { wch: 45 },
    ...periods.map(() => ({ wch: 22 }))
  ];

  XLSX.utils.book_append_sheet(wb, reportWs, 'Research & Innovation Report');

  // --- SHEET 2: OPTIONAL CONTRIBUTING RECORDS BREAKDOWN ---
  if (includeSourceBreakdown && sourceRecords && sourceRecords.length > 0) {
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
      'Inclusion / Exclusion Reason'
    ];

    const sourceDataRows = sourceRecords.map(r => [
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
    ]);

    const sanitizedSourceRows = [sourceHeaders, ...sourceDataRows].map(row =>
      row.map(sanitizeSpreadsheetCell)
    );
    const sourceWs = XLSX.utils.aoa_to_sheet(sanitizedSourceRows);

    sourceWs['!cols'] = [
      { wch: 20 },
      { wch: 22 },
      { wch: 15 },
      { wch: 36 },
      { wch: 40 },
      { wch: 25 },
      { wch: 16 },
      { wch: 30 },
      { wch: 18 },
      { wch: 22 },
      { wch: 35 }
    ];

    XLSX.utils.book_append_sheet(wb, sourceWs, 'Contributing Records');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generates PDF document buffer from report data.
 */
function generatePdfReport(reportData, includeSourceBreakdown = false) {
  return buildResearchReportPdf({
    reportData,
    includeSourceBreakdown
  });
}

module.exports = {
  getReportConfigOptions,
  generateReportData,
  generateExcelReport,
  generatePdfReport,
  discoverReportingPeriods,
  canonicalizeAgencyName,
  KNOWN_AGENCY_ALIASES
};

