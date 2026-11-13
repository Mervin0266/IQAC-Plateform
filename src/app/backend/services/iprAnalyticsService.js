'use strict';

/**
 * IPR Analytics Service — Patents & Copyrights Institutional Intelligence
 * CHRIST (Deemed to be University) — IQAC Platform
 *
 * Implements authoritative, server-side analytics, department attribution,
 * multi-faculty association safeguards, and calendar-year filtering for:
 * 1. IPR Overview (Combined Patents & Copyrights)
 * 2. Patents Analytics
 * 3. Copyrights Analytics
 * 4. Multi-Department Comparison
 * 5. Interactive Drill-Down Records
 */

const { Op } = require('sequelize');
const {
  Patent,
  Copyright,
  CopyrightFaculty,
  Faculty,
  Department,
  School,
  Campus,
  User
} = require('../models');
const { resolveAllowedDepartmentsForUser } = require('../utils/scopeHelper');

// Helper to normalize department names for matching
function normalizeDept(name) {
  if (!name) return '';
  return String(name).trim().toLowerCase().replace(/\s+/g, ' ');
}

// Helper to format currency in INR
function formatInr(amount) {
  const num = Number(amount) || 0;
  if (num >= 10000000) {
    return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹ ${(num / 100000).toFixed(2)} Lakhs`;
  }
  return `₹ ${num.toLocaleString('en-IN')}`;
}

/**
 * Resolves active department filter against user's permitted organizational scope.
 */
async function resolvePermittedDepartments(options, user) {
  const allowedScope = await resolveAllowedDepartmentsForUser(user || {});
  if (user && (user.isSystemAdmin || ['admin', 'authority', 'iqac_admin', 'super admin', 'super_admin'].includes(String(user.role || '').toLowerCase()))) {
    allowedScope.isUniversityWide = true;
  }

  let targetDepts = [];
  if (options.departments && Array.isArray(options.departments) && options.departments.length > 0) {
    targetDepts = options.departments.map(d => String(d).trim()).filter(Boolean);
  } else if (options.departments && typeof options.departments === 'string' && options.departments.trim() !== '') {
    targetDepts = options.departments.split(',').map(d => d.trim()).filter(Boolean);
  } else if (options.department && options.department !== 'All') {
    targetDepts = [String(options.department).trim()];
  }

  // If school filter is provided and no specific department chosen, resolve departments in that school
  if (targetDepts.length === 0 && options.school && options.school !== 'All') {
    try {
      const sch = await School.findOne({
        where: { [Op.or]: [{ name: options.school }, { id: options.school }] },
        include: [{ model: Department, as: 'departments', attributes: ['name'] }]
      });
      if (sch && sch.departments) {
        targetDepts = sch.departments.map(d => d.name);
      }
    } catch (e) {
      console.warn('[IPR Analytics] School resolution notice:', e.message);
    }
  }

  // If campus filter is provided and no specific department chosen, resolve departments in that campus
  if (targetDepts.length === 0 && options.campus && options.campus !== 'All') {
    try {
      const cmp = await Campus.findOne({
        where: { [Op.or]: [{ name: options.campus }, { id: options.campus }] },
        include: [{
          model: School,
          as: 'schools',
          include: [{ model: Department, as: 'departments', attributes: ['name'] }]
        }]
      });
      if (cmp && cmp.schools) {
        cmp.schools.forEach(s => {
          if (s.departments) {
            s.departments.forEach(d => targetDepts.push(d.name));
          }
        });
      }
    } catch (e) {
      console.warn('[IPR Analytics] Campus resolution notice:', e.message);
    }
  }

  // Validate against user scope
  if (!allowedScope.isUniversityWide) {
    const allowedSet = new Set(allowedScope.departments.map(normalizeDept));
    if (targetDepts.length > 0) {
      const unauthorized = targetDepts.filter(d => !allowedSet.has(normalizeDept(d)));
      if (unauthorized.length > 0) {
        const err = new Error(`Access denied. Department(s) '${unauthorized.join(', ')}' outside your authorized scope.`);
        err.status = 403;
        throw err;
      }
    } else {
      targetDepts = allowedScope.departments;
    }
  }

  return {
    isUniversityWide: allowedScope.isUniversityWide && targetDepts.length === 0,
    departments: targetDepts
  };
}

/**
 * Fetch authorized distinct Patents.
 */
async function fetchAuthorizedPatents({ scope, calendarYear, user }) {
  const where = {};

  // Authority role cannot view drafts if draft status exists
  if (user && user.role === 'authority') {
    where.status = { [Op.ne]: 'draft' };
  }

  // Department filtering
  if (!scope.isUniversityWide && scope.departments.length > 0) {
    where.department = { [Op.in]: scope.departments };
  }

  // Calendar Year filtering (based exclusively on Publication Date / publicationYear)
  if (calendarYear && calendarYear !== 'all') {
    if (calendarYear === 'missing') {
      where[Op.or] = [
        { publicationYear: null },
        { publishedDate: null }
      ];
    } else {
      const yrInt = parseInt(String(calendarYear).trim(), 10);
      if (!Number.isNaN(yrInt)) {
        const startDate = `${yrInt}-01-01`;
        const endDate = `${yrInt}-12-31`;
        where[Op.or] = [
          { publicationYear: yrInt },
          { publishedDate: { [Op.between]: [startDate, endDate] } }
        ];
      }
    }
  }

  const records = await Patent.findAll({
    where,
    order: [
      ['publicationYear', 'DESC NULLS LAST'],
      ['publishedDate', 'DESC NULLS LAST'],
      ['createdAt', 'DESC']
    ],
    raw: true
  });

  return records;
}

/**
 * Fetch authorized distinct Copyrights with multiple Faculty associations.
 */
async function fetchAuthorizedCopyrights({ scope, calendarYear, attributionBasis = 'original', user }) {
  const where = {};

  // Authority role cannot view drafts
  if (user && user.role === 'authority') {
    where.status = { [Op.ne]: 'draft' };
  }

  // Calendar Year filtering (based strictly on Date of Application / calendarYear)
  if (calendarYear && calendarYear !== 'all') {
    if (calendarYear === 'missing') {
      where[Op.or] = [
        { calendarYear: null },
        { dateOfApplication: null }
      ];
    } else {
      const yrInt = parseInt(String(calendarYear).trim(), 10);
      if (!Number.isNaN(yrInt)) {
        const startDate = `${yrInt}-01-01`;
        const endDate = `${yrInt}-12-31`;
        where[Op.or] = [
          { calendarYear: yrInt },
          { dateOfApplication: { [Op.between]: [startDate, endDate] } }
        ];
      }
    }
  }

  const rawCopyrights = await Copyright.findAll({
    where,
    include: [
      {
        model: CopyrightFaculty,
        as: 'facultyAssociations',
        include: [
          {
            model: Faculty,
            as: 'faculty',
            attributes: ['id', 'name', 'department', 'employeeId', 'designation']
          }
        ]
      }
    ],
    order: [
      ['calendarYear', 'DESC NULLS LAST'],
      ['dateOfApplication', 'DESC NULLS LAST'],
      ['createdAt', 'DESC']
    ]
  });

  // Scope filtering & Department Attribution
  const allowedSet = scope.isUniversityWide
    ? null
    : new Set(scope.departments.map(normalizeDept));

  const filteredCopyrights = [];
  for (const c of rawCopyrights) {
    const cJson = c.toJSON();
    const assocs = (cJson.facultyAssociations || []).filter(f => f.isValid);

    // Resolve departments associated with this copyright
    const originalDepts = new Set();
    const currentDepts = new Set();

    assocs.forEach(fa => {
      if (fa.originalDepartment) originalDepts.add(fa.originalDepartment.trim());
      const cur = (fa.faculty && fa.faculty.department) ? fa.faculty.department.trim() : (fa.originalDepartment ? fa.originalDepartment.trim() : null);
      if (cur) currentDepts.add(cur);
    });

    cJson.originalDepartments = Array.from(originalDepts);
    cJson.currentDepartments = Array.from(currentDepts);

    // Check if record matches permitted scope
    if (allowedSet) {
      const checkDepts = attributionBasis === 'current' ? currentDepts : originalDepts;
      const hasMatch = Array.from(checkDepts).some(d => allowedSet.has(normalizeDept(d))) ||
        (user && cJson.createdBy === user.id);
      if (!hasMatch) continue;
    }

    filteredCopyrights.push(cJson);
  }

  return filteredCopyrights;
}

/**
 * Computes comprehensive IPR Analytics.
 */
async function getIprDashboardAnalytics(options = {}, user = null) {
  const {
    view = 'overview', // 'overview' | 'patents' | 'copyrights'
    calendarYear = 'all',
    attributionBasis = 'original' // 'original' | 'current'
  } = options;

  const scope = await resolvePermittedDepartments(options, user);

  // 1. Fetch authorized data
  const [patents, copyrights] = await Promise.all([
    fetchAuthorizedPatents({ scope, calendarYear, user }),
    fetchAuthorizedCopyrights({ scope, calendarYear, attributionBasis, user })
  ]);

  // 2. Discover all available Calendar Years dynamically from actual records
  const allPatentsForYears = await Patent.findAll({ attributes: ['publicationYear', 'publishedDate'], raw: true });
  const allCopyrightsForYears = await Copyright.findAll({ attributes: ['calendarYear', 'dateOfApplication'], raw: true });

  const yearSet = new Set();
  allPatentsForYears.forEach(p => {
    if (p.publicationYear) yearSet.add(String(p.publicationYear));
    else if (p.publishedDate && p.publishedDate.length >= 4) {
      const y = p.publishedDate.slice(0, 4);
      if (/^\d{4}$/.test(y)) yearSet.add(y);
    }
  });
  allCopyrightsForYears.forEach(c => {
    if (c.calendarYear) yearSet.add(String(c.calendarYear));
    else if (c.dateOfApplication && c.dateOfApplication.length >= 4) {
      const y = c.dateOfApplication.slice(0, 4);
      if (/^\d{4}$/.test(y)) yearSet.add(y);
    }
  });

  const availableCalendarYears = Array.from(yearSet).sort((a, b) => Number(b) - Number(a));

  // Count missing date records in current scope
  let patentsMissingDateCount = 0;
  patents.forEach(p => {
    if (!p.publishedDate || !p.publicationYear) patentsMissingDateCount++;
  });
  let copyrightsMissingDateCount = 0;
  copyrights.forEach(c => {
    if (!c.dateOfApplication || !c.calendarYear) copyrightsMissingDateCount++;
  });

  // -------------------------------------------------------------
  // PATENTS METRICS
  // -------------------------------------------------------------
  let patentAppsFiled = 0;
  let patentsGranted = 0;
  let patentsLicensed = 0;
  let patentsPublished = 0;
  let totalPatentRevenueNum = 0;

  const patentStatusCounts = {};
  const patentTypeCounts = {};
  const patentYearCounts = {};
  const patentDeptMap = {};
  const patentPartnerMap = {};
  const patentFacultyMap = {};

  patents.forEach(p => {
    const st = (p.status || 'filed').toLowerCase();
    const type = p.patentType || 'National (Indian)';
    const dept = p.department || 'General';
    const rev = Number(p.revenue) || 0;
    const yr = p.publicationYear ? String(p.publicationYear) : (p.publishedDate ? p.publishedDate.slice(0, 4) : 'Undated');

    // KPI status classification
    if (st.includes('grant')) patentsGranted++;
    if (st.includes('commercial') || st.includes('license')) patentsLicensed++;
    if (st.includes('publish')) patentsPublished++;
    patentAppsFiled++; // All entered non-draft patents represent filed/submitted applications

    totalPatentRevenueNum += rev;

    // Distributions
    patentStatusCounts[p.status || 'Published'] = (patentStatusCounts[p.status || 'Published'] || 0) + 1;
    patentTypeCounts[type] = (patentTypeCounts[type] || 0) + 1;

    if (yr !== 'Undated') {
      patentYearCounts[yr] = (patentYearCounts[yr] || 0) + 1;
    }

    // Department breakdown
    if (!patentDeptMap[dept]) {
      patentDeptMap[dept] = { department: dept, count: 0, revenue: 0 };
    }
    patentDeptMap[dept].count++;
    patentDeptMap[dept].revenue += rev;

    // Commercial Partner breakdown
    if (p.partner && p.partner.trim() !== '') {
      const partnerName = p.partner.trim();
      if (!patentPartnerMap[partnerName]) {
        patentPartnerMap[partnerName] = { partner: partnerName, count: 0, revenue: 0 };
      }
      patentPartnerMap[partnerName].count++;
      patentPartnerMap[partnerName].revenue += rev;
    }

    // Faculty Inventors (parse inventors string)
    if (p.inventors) {
      const rawNames = p.inventors.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      rawNames.forEach(name => {
        if (!patentFacultyMap[name]) {
          patentFacultyMap[name] = { name, count: 0, department: dept };
        }
        patentFacultyMap[name].count++;
      });
    }
  });

  // -------------------------------------------------------------
  // COPYRIGHTS METRICS
  // -------------------------------------------------------------
  let copyrightAppsFiled = 0;
  let copyrightsRegistered = 0;
  let copyrightsPending = 0;
  let copyrightDrafts = 0;

  const copyrightYearCounts = {};
  const copyrightDeptMap = {};
  const copyrightFacultyMap = {};

  copyrights.forEach(c => {
    const isDraft = c.status === 'draft';
    const hasReg = Boolean(c.registrationNo && String(c.registrationNo).trim() !== '');
    const yr = c.calendarYear ? String(c.calendarYear) : (c.dateOfApplication ? c.dateOfApplication.slice(0, 4) : 'Undated');

    if (isDraft) {
      copyrightDrafts++;
    } else {
      copyrightAppsFiled++;
      if (hasReg) {
        copyrightsRegistered++;
      } else {
        copyrightsPending++;
      }
    }

    if (yr !== 'Undated') {
      copyrightYearCounts[yr] = (copyrightYearCounts[yr] || 0) + 1;
    }

    // Distinct department attribution
    const assocs = (c.facultyAssociations || []).filter(f => f.isValid);
    const seenDeptsForThisCopy = new Set();

    assocs.forEach(fa => {
      const d = attributionBasis === 'current'
        ? ((fa.faculty && fa.faculty.department) ? fa.faculty.department : fa.originalDepartment)
        : (fa.originalDepartment || (fa.faculty && fa.faculty.department));

      if (d && !seenDeptsForThisCopy.has(normalizeDept(d))) {
        seenDeptsForThisCopy.add(normalizeDept(d));
        if (!copyrightDeptMap[d]) {
          copyrightDeptMap[d] = { department: d, count: 0 };
        }
        copyrightDeptMap[d].count++;
      }

      // Faculty Creators
      const fKey = fa.employeeId ? `${fa.employeeId} - ${fa.facultyName || 'Faculty'}` : (fa.facultyName || 'Unknown');
      if (!copyrightFacultyMap[fKey]) {
        copyrightFacultyMap[fKey] = {
          employeeId: fa.employeeId,
          name: fa.facultyName || fa.employeeId,
          department: d || 'General',
          count: 0
        };
      }
      copyrightFacultyMap[fKey].count++;
    });
  });

  // -------------------------------------------------------------
  // COMBINED IPR OVERVIEW METRICS & CHARTS
  // -------------------------------------------------------------
  const totalPatentsCount = patents.length;
  const totalCopyrightsCount = copyrights.length;
  const totalIprsCount = totalPatentsCount + totalCopyrightsCount;

  // Combined Yearly Trend (Calendar Year basis)
  const combinedYears = Array.from(new Set([...Object.keys(patentYearCounts), ...Object.keys(copyrightYearCounts)]))
    .sort((a, b) => Number(a) - Number(b));

  const yearlyIprTrend = combinedYears.map(yr => ({
    year: yr,
    patents: patentYearCounts[yr] || 0,
    copyrights: copyrightYearCounts[yr] || 0,
    totalIprs: (patentYearCounts[yr] || 0) + (copyrightYearCounts[yr] || 0)
  }));

  // Combined Department Contribution
  const allDeptNames = Array.from(new Set([...Object.keys(patentDeptMap), ...Object.keys(copyrightDeptMap)]));
  const departmentIprContribution = allDeptNames.map(dept => {
    const pCount = patentDeptMap[dept]?.count || 0;
    const cCount = copyrightDeptMap[dept]?.count || 0;
    const pRev = patentDeptMap[dept]?.revenue || 0;
    return {
      department: dept,
      patents: pCount,
      copyrights: cCount,
      totalIprs: pCount + cCount,
      revenueInr: pRev,
      revenueFormatted: formatInr(pRev)
    };
  }).sort((a, b) => b.totalIprs - a.totalIprs);

  // Top Faculty IPR Contributors
  const allFacultyNames = Array.from(new Set([
    ...Object.keys(patentFacultyMap),
    ...Object.keys(copyrightFacultyMap).map(k => copyrightFacultyMap[k].name)
  ]));

  const topFacultyContributors = allFacultyNames.map(name => {
    const p = patentFacultyMap[name];
    const c = Object.values(copyrightFacultyMap).find(cf => cf.name === name || cf.employeeId === name);
    const pCount = p ? p.count : 0;
    const cCount = c ? c.count : 0;
    return {
      name,
      employeeId: c ? c.employeeId : null,
      department: (c && c.department) ? c.department : (p ? p.department : 'General'),
      patentsCount: pCount,
      copyrightsCount: cCount,
      totalIprs: pCount + cCount
    };
  }).filter(f => f.totalIprs > 0)
    .sort((a, b) => b.totalIprs - a.totalIprs)
    .slice(0, 10);

  // Patent Revenue Trend by Publication Year
  const patentRevenueByYear = {};
  patents.forEach(p => {
    const yr = p.publicationYear ? String(p.publicationYear) : (p.publishedDate ? p.publishedDate.slice(0, 4) : 'Undated');
    const rev = Number(p.revenue) || 0;
    if (rev > 0 && yr !== 'Undated') {
      patentRevenueByYear[yr] = (patentRevenueByYear[yr] || 0) + rev;
    }
  });

  const revenueTrend = Object.keys(patentRevenueByYear)
    .sort((a, b) => Number(a) - Number(b))
    .map(yr => ({
      year: yr,
      revenueInr: patentRevenueByYear[yr],
      revenueLakhs: Number((patentRevenueByYear[yr] / 100000).toFixed(2)),
      formatted: formatInr(patentRevenueByYear[yr])
    }));

  // Top Commercial Partners
  const topCommercialPartners = Object.values(patentPartnerMap)
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
    .slice(0, 8)
    .map(p => ({
      ...p,
      revenueFormatted: formatInr(p.revenue)
    }));

  return {
    success: true,
    view,
    calendarYear,
    attributionBasis,
    scopeDisplay: scope.isUniversityWide
      ? 'University-wide'
      : (scope.departments.length === 1 ? `Department: ${scope.departments[0]}` : `${scope.departments.length} Departments Selected`),
    availableCalendarYears,
    dateBasisLabel: 'Date Basis: Patents (Publication Date) | Copyrights (Date of Application)',

    // Missing date records
    missingDates: {
      patentsMissingPublicationDate: patentsMissingDateCount,
      copyrightsMissingApplicationDate: copyrightsMissingDateCount,
      note: 'Records with missing source dates are included in overall totals but excluded from dated year progression charts.'
    },

    // 1. COMBINED OVERVIEW SECTION
    overview: {
      totalIprs: totalIprsCount,
      totalPatents: totalPatentsCount,
      totalCopyrights: totalCopyrightsCount,
      patentApplicationsFiled: patentAppsFiled,
      copyrightApplicationsFiled: copyrightAppsFiled,
      totalRevenueInr: totalPatentRevenueNum,
      totalRevenueFormatted: formatInr(totalPatentRevenueNum),
      distribution: [
        { name: 'Patents', count: totalPatentsCount, fill: '#2855B9' },
        { name: 'Copyrights', count: totalCopyrightsCount, fill: '#7C3AED' }
      ],
      yearlyTrend: yearlyIprTrend,
      departmentContribution: departmentIprContribution,
      topFacultyContributors,
      revenueTrend
    },

    // 2. PATENTS SECTION
    patents: {
      totalPatents: totalPatentsCount,
      applicationsFiled: patentAppsFiled,
      grantedPatents: patentsGranted,
      licensedPatents: patentsLicensed,
      publishedPatents: patentsPublished,
      totalRevenueInr: totalPatentRevenueNum,
      totalRevenueFormatted: formatInr(totalPatentRevenueNum),
      statusDistribution: Object.entries(patentStatusCounts).map(([status, count]) => ({
        status,
        count
      })),
      typeDistribution: Object.entries(patentTypeCounts).map(([type, count]) => ({
        type,
        count
      })),
      patentsByPublicationYear: Object.entries(patentYearCounts)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([year, count]) => ({ year, count })),
      departmentContribution: Object.values(patentDeptMap).sort((a, b) => b.count - a.count),
      topInventors: Object.values(patentFacultyMap).sort((a, b) => b.count - a.count).slice(0, 10),
      topCommercialPartners,
      revenueTrend
    },

    // 3. COPYRIGHTS SECTION
    copyrights: {
      totalCopyrights: totalCopyrightsCount,
      applicationsFiled: copyrightAppsFiled,
      registeredCopyrights: copyrightsRegistered,
      pendingRegistration: copyrightsPending,
      draftCount: copyrightDrafts,
      registrationDistribution: [
        { name: 'Registered (Registration No. Issued)', count: copyrightsRegistered, fill: '#16A34A' },
        { name: 'Pending Registration (Diary / Applied)', count: copyrightsPending, fill: '#D97706' }
      ],
      copyrightsByApplicationYear: Object.entries(copyrightYearCounts)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([year, count]) => ({ year, count })),
      departmentContribution: Object.values(copyrightDeptMap).sort((a, b) => b.count - a.count),
      topCreators: Object.values(copyrightFacultyMap).sort((a, b) => b.count - a.count).slice(0, 10),
      applicationTrend: combinedYears.map(yr => ({
        year: yr,
        applications: copyrightYearCounts[yr] || 0
      }))
    }
  };
}

/**
 * Retrieves interactive drill-down source records.
 */
async function getIprDrilldownRecords(query = {}, user = null) {
  const {
    module = 'patents', // 'patents' | 'copyrights' | 'all'
    kpi, // 'total' | 'filed' | 'granted' | 'licensed' | 'registered' | 'pending' | 'year' | 'department' | 'faculty' | 'partner'
    calendarYear,
    department,
    departments,
    school,
    campus,
    facultyName,
    partnerName,
    search,
    attributionBasis = 'original'
  } = query;

  const scope = await resolvePermittedDepartments({ department, departments, school, campus }, user);

  let results = [];

  // Fetch matching Patents
  if (module === 'patents' || module === 'all') {
    const rawPatents = await fetchAuthorizedPatents({ scope, calendarYear, user });
    let filteredP = rawPatents;

    if (kpi === 'granted') {
      filteredP = filteredP.filter(p => (p.status || '').toLowerCase().includes('grant'));
    } else if (kpi === 'licensed') {
      filteredP = filteredP.filter(p => (p.status || '').toLowerCase().includes('commercial') || (p.status || '').toLowerCase().includes('license'));
    } else if (kpi === 'published') {
      filteredP = filteredP.filter(p => (p.status || '').toLowerCase().includes('publish'));
    } else if (kpi === 'filed') {
      filteredP = filteredP.filter(p => (p.status || '').toLowerCase() === 'filed' || (p.status || '').toLowerCase() === 'under_examination');
    }

    if (partnerName) {
      filteredP = filteredP.filter(p => p.partner && p.partner.toLowerCase().includes(partnerName.toLowerCase()));
    }

    if (facultyName) {
      filteredP = filteredP.filter(p => p.inventors && p.inventors.toLowerCase().includes(facultyName.toLowerCase()));
    }

    if (search) {
      const q = search.toLowerCase();
      filteredP = filteredP.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.inventors && p.inventors.toLowerCase().includes(q)) ||
        (p.applicationNo && p.applicationNo.toLowerCase().includes(q)) ||
        (p.patentNo && p.patentNo.toLowerCase().includes(q))
      );
    }

    results.push(...filteredP.map(p => ({
      id: p.id,
      module: 'Patent',
      title: p.title,
      type: p.patentType || 'National (Indian)',
      status: p.status || 'Published',
      department: p.department || 'General',
      date: p.publishedDate || p.filedDate || '—',
      dateLabel: p.publishedDate ? 'Publication Date' : 'Filing Date',
      year: p.publicationYear || (p.publishedDate ? p.publishedDate.slice(0, 4) : 'Undated'),
      inventorsOrCreators: p.inventors || 'Not specified',
      registrationOrAppNo: p.patentNo || p.applicationNo || 'Pending',
      revenue: Number(p.revenue) || 0,
      partner: p.partner || null
    })));
  }

  // Fetch matching Copyrights
  if (module === 'copyrights' || module === 'all') {
    const rawCopyrights = await fetchAuthorizedCopyrights({ scope, calendarYear, attributionBasis, user });
    let filteredC = rawCopyrights;

    if (kpi === 'registered') {
      filteredC = filteredC.filter(c => Boolean(c.registrationNo && String(c.registrationNo).trim() !== ''));
    } else if (kpi === 'pending') {
      filteredC = filteredC.filter(c => !c.registrationNo || String(c.registrationNo).trim() === '');
    } else if (kpi === 'filed') {
      filteredC = filteredC.filter(c => c.status !== 'draft');
    }

    if (facultyName) {
      filteredC = filteredC.filter(c => {
        const assocs = c.facultyAssociations || [];
        return assocs.some(fa => (fa.facultyName && fa.facultyName.toLowerCase().includes(facultyName.toLowerCase())) ||
          (fa.employeeId && fa.employeeId.includes(facultyName)));
      });
    }

    if (search) {
      const q = search.toLowerCase();
      filteredC = filteredC.filter(c =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.empIdsRaw && c.empIdsRaw.toLowerCase().includes(q)) ||
        (c.registrationNo && c.registrationNo.toLowerCase().includes(q)) ||
        (c.diaryNumber && c.diaryNumber.toLowerCase().includes(q))
      );
    }

    results.push(...filteredC.map(c => {
      const assocs = (c.facultyAssociations || []).filter(f => f.isValid);
      const names = assocs.map(a => a.facultyName || a.employeeId).join(', ') || c.empIdsRaw || 'Not specified';
      const depts = Array.from(new Set(assocs.map(a => a.originalDepartment).filter(Boolean))).join(', ') || 'General';

      return {
        id: c.id,
        module: 'Copyright',
        title: c.title,
        type: 'Copyright',
        status: c.registrationNo ? 'Registered' : 'Pending Registration',
        department: depts,
        date: c.dateOfApplication || '—',
        dateLabel: 'Application Date',
        year: c.calendarYear || (c.dateOfApplication ? c.dateOfApplication.slice(0, 4) : 'Undated'),
        inventorsOrCreators: names,
        registrationOrAppNo: c.registrationNo || c.diaryNumber || 'Pending',
        revenue: 0,
        partner: null
      };
    }));
  }

  return {
    success: true,
    totalRecords: results.length,
    records: results
  };
}

module.exports = {
  getIprDashboardAnalytics,
  getIprDrilldownRecords,
  resolvePermittedDepartments
};
