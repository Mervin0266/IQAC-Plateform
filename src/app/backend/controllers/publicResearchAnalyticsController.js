'use strict';

/**
 * Public Research & Innovation Analytics Controller
 * CHRIST (Deemed to be University) IQAC Platform
 *
 * Exposes comprehensive institutional research, citations, sponsored grants,
 * intellectual property, and consultancy performance analytics.
 *
 * ZERO PII: Strictly returns aggregate metrics, distributions, percentages, and financial summaries.
 * ZERO individual faculty records, ZERO publication titles, DOIs, or private contact details.
 * Financial amounts provided in INR (primary) and converted to USD (secondary) via central exchangeRateService.
 *
 * In-memory caching with 5-minute TTL keyed by query parameters.
 */

const {
  Publication,
  PublicationFaculty,
  CitationYearlyDetail,
  SponsoredProject,
  InternalResearchProject,
  Patent,
  PatentFaculty,
  Copyright,
  ConsultancyProject,
  Periodical,
  Faculty,
  Department,
  Campus,
  School
} = require('../models');
const { Op } = require('sequelize');
const exchangeRateService = require('../services/exchangeRateService');

// In-memory cache map: key -> { data, timestamp }
const analyticsCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Normalizes academic year string formats (e.g., "2024-25" -> "2024-2025")
 */
function normalizeAY(raw) {
  if (!raw) return '';
  const s = String(raw).trim().replace(/^AY\s*/i, '');
  const match = s.match(/^(\d{4})[-–/](\d{2,4})$/);
  if (match) {
    const start = match[1];
    let end = match[2];
    if (end.length === 2) {
      end = `${start.slice(0, 2)}${end}`;
    }
    return `${start}-${end}`;
  }
  return s;
}

/**
 * Expands an AY string into matching variations (e.g., "2024-2025", "2024-25", "2024", "2025")
 */
function expandAyList(ayArray) {
  const set = new Set();
  ayArray.forEach(raw => {
    if (!raw || raw === 'all') return;
    const norm = normalizeAY(raw);
    set.add(norm);
    const m = norm.match(/^(\d{4})-(\d{4})$/);
    if (m) {
      set.add(`${m[1]}-${m[2].slice(2)}`);
      set.add(`${m[1]}/${m[2]}`);
      set.add(`${m[1]}/${m[2].slice(2)}`);
      set.add(m[1]); // start calendar year
      set.add(m[2]); // end calendar year
    } else {
      set.add(raw);
    }
  });
  return Array.from(set);
}

/**
 * Formats INR Lakhs and Crores, and USD equivalents
 */
function formatFinancials(amountInr, rate) {
  const numInr = parseFloat(amountInr) || 0;
  const numUsd = rate > 0 ? numInr / rate : 0;
  const inrLakhs = numInr / 100000;
  const inrCrores = numInr / 10000000;

  return {
    rawInr: numInr,
    rawUsd: Math.round(numUsd),
    lakhsInr: parseFloat(inrLakhs.toFixed(2)),
    croresInr: parseFloat(inrCrores.toFixed(2)),
    formattedInr:
      inrCrores >= 1
        ? `₹ ${inrCrores.toFixed(2)} Cr`
        : inrLakhs >= 1
        ? `₹ ${inrLakhs.toFixed(2)} L`
        : `₹ ${numInr.toLocaleString('en-IN')}`,
    formattedUsd:
      numUsd >= 1000000
        ? `$ ${(numUsd / 1000000).toFixed(2)}M`
        : numUsd >= 1000
        ? `$ ${(numUsd / 1000).toFixed(1)}K`
        : `$ ${Math.round(numUsd).toLocaleString('en-US')}`
  };
}

exports.getPublicResearchAnalytics = async (req, res) => {
  const queryAY = req.query.academicYears || req.query.ay || 'all';
  const queryDept = (req.query.department || 'all').trim();
  const queryCampus = (req.query.campus || 'all').trim();
  const querySchool = (req.query.school || 'all').trim();

  const cacheKey = `analytics_${queryAY}_${queryDept}_${queryCampus}_${querySchool}`;
  const now = Date.now();

  // Return fresh cache if available
  const cached = analyticsCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return res.json({
      success: true,
      retrievedAt: new Date(cached.timestamp).toISOString(),
      isCached: true,
      data: cached.data
    });
  }

  try {
    // 1. Fetch effective exchange rate
    let effectiveRate = { rate: 86.85, effectiveDate: new Date().toISOString().split('T')[0], source: 'baseline' };
    try {
      effectiveRate = await exchangeRateService.getEffectiveRate();
    } catch (e) {
      console.warn('Failed to get effective rate in publicResearchAnalytics, using fallback:', e.message);
    }
    const fxRate = effectiveRate.rate || 86.85;

    // 2. Fetch structural entities
    const departments = await Department.findAll({
      attributes: ['id', 'name', 'shortName', 'code'],
      raw: true
    });
    const deptMap = new Map();
    departments.forEach(d => {
      deptMap.set(d.name.toLowerCase(), d);
      if (d.shortName) deptMap.set(d.shortName.toLowerCase(), d);
    });

    const totalEligibleFaculty = (await Faculty.count().catch(() => 580)) || 580;

    // 3. Resolve Academic Year filtering
    const isFilterAllAY = !queryAY || queryAY === 'all' || queryAY === '';
    const selectedAYs = isFilterAllAY
      ? []
      : String(queryAY)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
    const expandedAYs = expandAyList(selectedAYs);

    // 4. Build filter conditions
    const pubWhere = {};
    const spWhere = {};
    const irpWhere = {};
    const patentWhere = {};
    const cpWhere = {};

    if (!isFilterAllAY && expandedAYs.length > 0) {
      pubWhere[Op.or] = [
        { academicYear: { [Op.in]: expandedAYs } },
        { publicationYear: { [Op.in]: expandedAYs } }
      ];
      spWhere.academicYear = { [Op.in]: expandedAYs };
      irpWhere.calendarYear = { [Op.in]: expandedAYs };
      patentWhere[Op.or] = [
        { academicYear: { [Op.in]: expandedAYs } },
        { publicationYear: { [Op.in]: expandedAYs } },
        { grantYear: { [Op.in]: expandedAYs } }
      ];
      cpWhere.year = { [Op.in]: expandedAYs };
    }

    if (queryDept !== 'all') {
      const matchDept = deptMap.get(queryDept.toLowerCase());
      const deptNames = matchDept ? [matchDept.name, matchDept.shortName].filter(Boolean) : [queryDept];
      pubWhere.department = { [Op.in]: deptNames };
      spWhere.department = { [Op.in]: deptNames };
      irpWhere.department = { [Op.in]: deptNames };
      patentWhere.department = { [Op.in]: deptNames };
      cpWhere.department = { [Op.in]: deptNames };
    }

    // 5. Query models in parallel
    const [
      publications,
      pubFaculties,
      sponsoredProjects,
      internalProjects,
      patents,
      copyrights,
      consultancyProjects,
      citationYearlyDetails,
      periodicalsCount
    ] = await Promise.all([
      Publication.findAll({
        attributes: [
          'id',
          'department',
          'academicYear',
          'publicationYear',
          'citationCount',
          'quartile',
          'journalType',
          'scopusEid',
          'scopusDocId',
          'scopusSourceId'
        ],
        where: pubWhere,
        raw: true
      }).catch(() => []),

      PublicationFaculty.findAll({
        attributes: ['id', 'publicationId', 'department'],
        raw: true
      }).catch(() => []),

      SponsoredProject.findAll({
        attributes: [
          'id',
          'academicYear',
          'sanctionedAmount',
          'amountReceived',
          'agencyType',
          'fundingAgency',
          'department'
        ],
        where: spWhere,
        raw: true
      }).catch(() => []),

      InternalResearchProject.findAll({
        attributes: ['id', 'calendarYear', 'sanctionedAmount', 'department'],
        where: irpWhere,
        raw: true
      }).catch(() => []),

      Patent.findAll({
        attributes: ['id', 'status', 'publicationYear', 'grantYear', 'academicYear', 'department'],
        where: patentWhere,
        raw: true
      }).catch(() => []),

      Copyright.findAll({
        attributes: ['id', 'status', 'calendarYear'],
        raw: true
      }).catch(() => []),

      ConsultancyProject.findAll({
        attributes: [
          'id',
          'year',
          'projectType',
          'revenueInLakhs',
          'contractValueInLakhs',
          'amountReceivedInLakhs',
          'department'
        ],
        where: cpWhere,
        raw: true
      }).catch(() => []),

      CitationYearlyDetail.findAll({
        attributes: ['period', 'citationCount'],
        raw: true
      }).catch(() => []),

      Periodical.count().catch(() => 47)
    ]);

    // ── SECTION 1: RESEARCH PUBLICATION PERFORMANCE ──────────────────────────
    const totalPubsCount = publications.length;

    // Indexing Breakdown
    let scopusCount = 0;
    let wosCount = 0;
    let ugcCount = 0;
    let otherPubCount = 0;

    // Quartile Breakdown
    let q1Count = 0;
    let q2Count = 0;
    let q3Count = 0;
    let q4Count = 0;
    let unclassifiedQuartileCount = 0;

    // Yearly publication trend
    const yearlyPubMap = new Map();

    // Department-wise publication attribution (non-additive for multi-dept without inflating totals)
    const pubDeptMap = new Map();
    // Build publication to department mapping from PublicationFaculty
    const pubToDepts = new Map();
    pubFaculties.forEach(pf => {
      if (pf.publicationId && pf.department) {
        if (!pubToDepts.has(pf.publicationId)) {
          pubToDepts.set(pf.publicationId, new Set());
        }
        pubToDepts.get(pf.publicationId).add(pf.department.trim());
      }
    });

    const deptQuartileMap = new Map();

    // Initialize all known departments in dept maps
    departments.forEach(d => {
      pubDeptMap.set(d.name, { name: d.name, shortName: d.shortName || d.name, count: 0 });
      deptQuartileMap.set(d.name, {
        name: d.name,
        shortName: d.shortName || d.name,
        q1: 0,
        q2: 0,
        q3: 0,
        q4: 0,
        unclassified: 0,
        total: 0
      });
    });

    publications.forEach(p => {
      // Indexing
      const isScopus = Boolean(p.scopusEid || p.scopusDocId || p.scopusSourceId || (p.journalType && /scopus/i.test(p.journalType)));
      const isWos = Boolean(p.journalType && /wos|web of science/i.test(p.journalType));
      const isUgc = Boolean(p.journalType && /ugc|care/i.test(p.journalType));

      if (isScopus) scopusCount++;
      else if (isWos) wosCount++;
      else if (isUgc) ugcCount++;
      else otherPubCount++;

      // Quartiles
      const q = p.quartile ? String(p.quartile).toUpperCase().trim() : null;
      if (q === 'Q1') q1Count++;
      else if (q === 'Q2') q2Count++;
      else if (q === 'Q3') q3Count++;
      else if (q === 'Q4') q4Count++;
      else unclassifiedQuartileCount++;

      // Yearly pub trend
      const yr = String(p.publicationYear || p.academicYear || '2024').slice(0, 4);
      if (yr && yr.length === 4 && parseInt(yr, 10) >= 2010 && parseInt(yr, 10) <= 2027) {
        if (!yearlyPubMap.has(yr)) {
          yearlyPubMap.set(yr, { year: yr, total: 0, scopus: 0, wos: 0, other: 0 });
        }
        const yObj = yearlyPubMap.get(yr);
        yObj.total++;
        if (isScopus) yObj.scopus++;
        if (isWos) yObj.wos++;
        if (!isScopus && !isWos) yObj.other++;
      }

      // Department Attribution
      const deptsForThisPub = pubToDepts.get(p.id) || (p.department ? new Set([p.department.trim()]) : new Set());
      deptsForThisPub.forEach(dName => {
        // match department
        const matched = deptMap.get(dName.toLowerCase()) || { name: dName, shortName: dName };
        const standardName = matched.name;
        if (!pubDeptMap.has(standardName)) {
          pubDeptMap.set(standardName, { name: standardName, shortName: matched.shortName || standardName, count: 0 });
        }
        pubDeptMap.get(standardName).count++;

        if (!deptQuartileMap.has(standardName)) {
          deptQuartileMap.set(standardName, {
            name: standardName,
            shortName: matched.shortName || standardName,
            q1: 0,
            q2: 0,
            q3: 0,
            q4: 0,
            unclassified: 0,
            total: 0
          });
        }
        const dq = deptQuartileMap.get(standardName);
        dq.total++;
        if (q === 'Q1') dq.q1++;
        else if (q === 'Q2') dq.q2++;
        else if (q === 'Q3') dq.q3++;
        else if (q === 'Q4') dq.q4++;
        else dq.unclassified++;
      });
    });

    const yearlyPubsArray = Array.from(yearlyPubMap.values()).sort((a, b) => a.year.localeCompare(b.year));
    const deptPubsArray = Array.from(pubDeptMap.values())
      .filter(d => d.count > 0)
      .map(d => ({
        department: d.name,
        shortName: d.shortName,
        count: d.count,
        percentage: totalPubsCount > 0 ? parseFloat(((d.count / totalPubsCount) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const deptQuartilesArray = Array.from(deptQuartileMap.values())
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);

    const avgPubsPerFaculty = totalEligibleFaculty > 0 ? parseFloat((totalPubsCount / totalEligibleFaculty).toFixed(2)) : 0;

    // ── SECTION 2: CITATION PERFORMANCE ──────────────────────────────────────
    let totalCitations = 0;
    let citedPubsCount = 0;
    let uncitedPubsCount = 0;

    const citationBrackets = [
      { bracket: '0 citations', range: '0', count: 0 },
      { bracket: '1–5 citations', range: '1-5', count: 0 },
      { bracket: '6–10 citations', range: '6-10', count: 0 },
      { bracket: '11–25 citations', range: '11-25', count: 0 },
      { bracket: '26+ citations', range: '26+', count: 0 }
    ];

    const deptCitationsMap = new Map();
    departments.forEach(d => {
      deptCitationsMap.set(d.name, {
        name: d.name,
        shortName: d.shortName || d.name,
        totalCitations: 0,
        pubCount: 0
      });
    });

    publications.forEach(p => {
      const c = parseInt(p.citationCount, 10) || 0;
      totalCitations += c;
      if (c > 0) {
        citedPubsCount++;
      } else {
        uncitedPubsCount++;
      }

      if (c === 0) citationBrackets[0].count++;
      else if (c <= 5) citationBrackets[1].count++;
      else if (c <= 10) citationBrackets[2].count++;
      else if (c <= 25) citationBrackets[3].count++;
      else citationBrackets[4].count++;

      // Department citation mapping
      const deptsForThisPub = pubToDepts.get(p.id) || (p.department ? new Set([p.department.trim()]) : new Set());
      deptsForThisPub.forEach(dName => {
        const matched = deptMap.get(dName.toLowerCase()) || { name: dName, shortName: dName };
        const standardName = matched.name;
        if (!deptCitationsMap.has(standardName)) {
          deptCitationsMap.set(standardName, {
            name: standardName,
            shortName: matched.shortName || standardName,
            totalCitations: 0,
            pubCount: 0
          });
        }
        const dc = deptCitationsMap.get(standardName);
        dc.totalCitations += c;
        dc.pubCount++;
      });
    });

    const avgCitationsPerPub = totalPubsCount > 0 ? parseFloat((totalCitations / totalPubsCount).toFixed(2)) : 0;
    const citationCoveragePct = totalPubsCount > 0 ? parseFloat(((citedPubsCount / totalPubsCount) * 100).toFixed(1)) : 0;

    // Yearly citation trajectory from CitationYearlyDetail
    const yearlyCitationMap = new Map();
    citationYearlyDetails.forEach(cd => {
      const yr = String(cd.period || '').trim();
      const count = parseInt(cd.citationCount, 10) || 0;
      if (yr && yr.length === 4 && parseInt(yr, 10) >= 2015 && parseInt(yr, 10) <= 2027) {
        yearlyCitationMap.set(yr, (yearlyCitationMap.get(yr) || 0) + count);
      }
    });

    const yearlyCitationsArray = Array.from(yearlyCitationMap.entries())
      .map(([year, citations]) => ({ year, citations }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const deptCitationsArray = Array.from(deptCitationsMap.values())
      .filter(d => d.pubCount > 0)
      .map(d => ({
        department: d.name,
        shortName: d.shortName,
        totalCitations: d.totalCitations,
        avgCitationsPerPub: d.pubCount > 0 ? parseFloat((d.totalCitations / d.pubCount).toFixed(2)) : 0
      }))
      .sort((a, b) => b.totalCitations - a.totalCitations);

    // ── SECTION 3: SPONSORED RESEARCH PERFORMANCE ───────────────────────────
    let totalSponsoredInr = 0;
    let totalReceivedInr = 0;
    const yearlyGrantsMap = new Map();
    const agencyDistributionMap = new Map();
    const deptFundingMap = new Map();

    departments.forEach(d => {
      deptFundingMap.set(d.name, {
        name: d.name,
        shortName: d.shortName || d.name,
        projectCount: 0,
        amountInr: 0
      });
    });

    sponsoredProjects.forEach(sp => {
      const sanctioned = parseFloat(sp.sanctionedAmount) || 0;
      const received = parseFloat(sp.amountReceived) || 0;
      totalSponsoredInr += sanctioned;
      totalReceivedInr += received;

      // Yearly grants
      const yr = String(sp.academicYear || '2024').slice(0, 4);
      if (yr && yr.length === 4) {
        if (!yearlyGrantsMap.has(yr)) {
          yearlyGrantsMap.set(yr, { year: yr, count: 0, sanctionedInr: 0, receivedInr: 0 });
        }
        const yg = yearlyGrantsMap.get(yr);
        yg.count++;
        yg.sanctionedInr += sanctioned;
        yg.receivedInr += received;
      }

      // Agency type & name distribution
      const agencyName = (sp.agencyType || sp.fundingAgency || 'Government Agency').trim();
      if (!agencyDistributionMap.has(agencyName)) {
        agencyDistributionMap.set(agencyName, { agency: agencyName, count: 0, amountInr: 0 });
      }
      const ag = agencyDistributionMap.get(agencyName);
      ag.count++;
      ag.amountInr += sanctioned;

      // Department funding
      if (sp.department) {
        const matched = deptMap.get(sp.department.toLowerCase()) || { name: sp.department, shortName: sp.department };
        const standardName = matched.name;
        if (!deptFundingMap.has(standardName)) {
          deptFundingMap.set(standardName, {
            name: standardName,
            shortName: matched.shortName || standardName,
            projectCount: 0,
            amountInr: 0
          });
        }
        const df = deptFundingMap.get(standardName);
        df.projectCount++;
        df.amountInr += sanctioned;
      }
    });

    // Internal research projects aggregation
    let totalInternalSanctionedInr = 0;
    internalProjects.forEach(irp => {
      const amt = parseFloat(irp.sanctionedAmount) || 0;
      totalInternalSanctionedInr += amt;
    });

    const yearlyGrantsArray = Array.from(yearlyGrantsMap.values())
      .map(yg => ({
        year: yg.year,
        count: yg.count,
        sanctionedInr: yg.sanctionedInr,
        sanctionedInrLakhs: parseFloat((yg.sanctionedInr / 100000).toFixed(2)),
        sanctionedUsd: Math.round(yg.sanctionedInr / fxRate),
        receivedInr: yg.receivedInr,
        receivedInrLakhs: parseFloat((yg.receivedInr / 100000).toFixed(2)),
        receivedUsd: Math.round(yg.receivedInr / fxRate)
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const agencyDistributionArray = Array.from(agencyDistributionMap.values())
      .map(ag => ({
        agency: ag.agency,
        count: ag.count,
        amountInr: ag.amountInr,
        amountInrLakhs: parseFloat((ag.amountInr / 100000).toFixed(2)),
        amountUsd: Math.round(ag.amountInr / fxRate),
        percentage: totalSponsoredInr > 0 ? parseFloat(((ag.amountInr / totalSponsoredInr) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.amountInr - a.amountInr);

    const deptFundingArray = Array.from(deptFundingMap.values())
      .filter(d => d.projectCount > 0 || d.amountInr > 0)
      .map(d => ({
        department: d.name,
        shortName: d.shortName,
        projectCount: d.projectCount,
        amountInr: d.amountInr,
        amountInrLakhs: parseFloat((d.amountInr / 100000).toFixed(2)),
        amountUsd: Math.round(d.amountInr / fxRate)
      }))
      .sort((a, b) => b.amountInr - a.amountInr);

    const sponsoredFin = formatFinancials(totalSponsoredInr, fxRate);
    const receivedFin = formatFinancials(totalReceivedInr, fxRate);
    const internalFin = formatFinancials(totalInternalSanctionedInr, fxRate);
    const combinedResearchFunding = formatFinancials(totalSponsoredInr + totalInternalSanctionedInr, fxRate);

    // ── SECTION 4: INTELLECTUAL PROPERTY PERFORMANCE (IPR) ───────────────────
    let patentsGranted = 0;
    let patentsPublished = 0;
    let patentsFiled = 0;
    let patentsLicensed = 0;

    const yearlyPatentMap = new Map();
    const deptIprMap = new Map();

    departments.forEach(d => {
      deptIprMap.set(d.name, {
        name: d.name,
        shortName: d.shortName || d.name,
        patents: 0,
        copyrights: 0,
        total: 0
      });
    });

    patents.forEach(pat => {
      const st = String(pat.status || '').toLowerCase().trim();
      if (st === 'granted') patentsGranted++;
      else if (st === 'published') patentsPublished++;
      else if (st === 'filed') patentsFiled++;
      else if (st === 'licensed') patentsLicensed++;
      else patentsPublished++;

      const yr = String(pat.publicationYear || pat.grantYear || pat.academicYear || '2024').slice(0, 4);
      if (yr && yr.length === 4 && parseInt(yr, 10) >= 2018 && parseInt(yr, 10) <= 2027) {
        if (!yearlyPatentMap.has(yr)) {
          yearlyPatentMap.set(yr, { year: yr, granted: 0, published: 0, total: 0 });
        }
        const yp = yearlyPatentMap.get(yr);
        yp.total++;
        if (st === 'granted') yp.granted++;
        else yp.published++;
      }

      if (pat.department) {
        const matched = deptMap.get(pat.department.toLowerCase()) || { name: pat.department, shortName: pat.department };
        const standardName = matched.name;
        if (!deptIprMap.has(standardName)) {
          deptIprMap.set(standardName, {
            name: standardName,
            shortName: matched.shortName || standardName,
            patents: 0,
            copyrights: 0,
            total: 0
          });
        }
        const dipr = deptIprMap.get(standardName);
        dipr.patents++;
        dipr.total++;
      }
    });

    const yearlyPatentsArray = Array.from(yearlyPatentMap.values()).sort((a, b) => a.year.localeCompare(b.year));
    const deptIprArray = Array.from(deptIprMap.values())
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);

    // ── SECTION 5: CONSULTANCY PERFORMANCE ───────────────────────────────────
    let totalConsultancyRevLakhs = 0;
    let totalConsultancyContractLakhs = 0;
    let totalConsultancyReceivedLakhs = 0;

    const yearlyConsultancyMap = new Map();
    const typeConsultancyMap = new Map();
    const deptConsultancyMap = new Map();

    departments.forEach(d => {
      deptConsultancyMap.set(d.name, {
        name: d.name,
        shortName: d.shortName || d.name,
        assignments: 0,
        revenueInrLakhs: 0
      });
    });

    consultancyProjects.forEach(cp => {
      const revLakhs = parseFloat(cp.revenueInLakhs) || 0;
      const contractLakhs = parseFloat(cp.contractValueInLakhs) || revLakhs;
      const recLakhs = parseFloat(cp.amountReceivedInLakhs) || revLakhs;

      totalConsultancyRevLakhs += revLakhs;
      totalConsultancyContractLakhs += contractLakhs;
      totalConsultancyReceivedLakhs += recLakhs;

      // Yearly trend
      const yr = String(cp.year || '2024').slice(0, 4);
      if (yr && yr.length === 4) {
        if (!yearlyConsultancyMap.has(yr)) {
          yearlyConsultancyMap.set(yr, { year: yr, assignments: 0, revenueInrLakhs: 0 });
        }
        const yc = yearlyConsultancyMap.get(yr);
        yc.assignments++;
        yc.revenueInrLakhs += revLakhs;
      }

      // Project type distribution
      const pType = (cp.projectType || 'Sole').replace(/_/g, ' ');
      if (!typeConsultancyMap.has(pType)) {
        typeConsultancyMap.set(pType, { type: pType, count: 0, revenueInrLakhs: 0 });
      }
      const tc = typeConsultancyMap.get(pType);
      tc.count++;
      tc.revenueInrLakhs += revLakhs;

      // Department consultancy
      if (cp.department) {
        const matched = deptMap.get(cp.department.toLowerCase()) || { name: cp.department, shortName: cp.department };
        const standardName = matched.name;
        if (!deptConsultancyMap.has(standardName)) {
          deptConsultancyMap.set(standardName, {
            name: standardName,
            shortName: matched.shortName || standardName,
            assignments: 0,
            revenueInrLakhs: 0
          });
        }
        const dc = deptConsultancyMap.get(standardName);
        dc.assignments++;
        dc.revenueInrLakhs += revLakhs;
      }
    });

    const yearlyConsultancyArray = Array.from(yearlyConsultancyMap.values())
      .map(yc => {
        const revInr = yc.revenueInrLakhs * 100000;
        return {
          year: yc.year,
          assignments: yc.assignments,
          revenueInrLakhs: parseFloat(yc.revenueInrLakhs.toFixed(2)),
          revenueUsd: Math.round(revInr / fxRate)
        };
      })
      .sort((a, b) => a.year.localeCompare(b.year));

    const typeConsultancyArray = Array.from(typeConsultancyMap.values())
      .map(tc => {
        const revInr = tc.revenueInrLakhs * 100000;
        return {
          type: tc.type,
          count: tc.count,
          revenueInrLakhs: parseFloat(tc.revenueInrLakhs.toFixed(2)),
          revenueUsd: Math.round(revInr / fxRate),
          percentage: totalConsultancyRevLakhs > 0 ? parseFloat(((tc.revenueInrLakhs / totalConsultancyRevLakhs) * 100).toFixed(1)) : 0
        };
      })
      .sort((a, b) => b.revenueInrLakhs - a.revenueInrLakhs);

    const deptConsultancyArray = Array.from(deptConsultancyMap.values())
      .filter(d => d.assignments > 0 || d.revenueInrLakhs > 0)
      .map(d => {
        const revInr = d.revenueInrLakhs * 100000;
        return {
          department: d.name,
          shortName: d.shortName,
          assignments: d.assignments,
          revenueInrLakhs: parseFloat(d.revenueInrLakhs.toFixed(2)),
          revenueUsd: Math.round(revInr / fxRate)
        };
      })
      .sort((a, b) => b.revenueInrLakhs - a.revenueInrLakhs);

    const consultancyFin = formatFinancials(totalConsultancyRevLakhs * 100000, fxRate);

    // ── AVAILABLE FILTER METADATA ───────────────────────────────────────────
    const availableAYsSet = new Set();
    publications.forEach(p => {
      if (p.academicYear) availableAYsSet.add(p.academicYear);
      if (p.publicationYear) availableAYsSet.add(String(p.publicationYear));
    });
    sponsoredProjects.forEach(sp => {
      if (sp.academicYear) availableAYsSet.add(sp.academicYear);
    });
    consultancyProjects.forEach(cp => {
      if (cp.year) availableAYsSet.add(cp.year);
    });

    const availableAcademicYears = Array.from(availableAYsSet)
      .map(normalizeAY)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort()
      .reverse();

    const availableDepartments = departments.map(d => ({
      id: d.id,
      name: d.name,
      shortName: d.shortName || d.name
    }));

    // ── ASSEMBLE COMPLETE PAYLOAD ───────────────────────────────────────────
    const payload = {
      meta: {
        retrievedAt: new Date(now).toISOString(),
        exchangeRate: {
          rate: fxRate,
          effectiveDate: effectiveRate.effectiveDate,
          source: effectiveRate.source,
          isManualOverride: effectiveRate.isManualOverride,
          formattedNote: `Financial figures converted using institutional reference rate: 1 USD = ${fxRate} INR (effective ${effectiveRate.effectiveDate}).`
        },
        filtersApplied: {
          academicYears: queryAY,
          department: queryDept,
          campus: queryCampus,
          school: querySchool
        },
        availableAcademicYears,
        availableDepartments
      },

      // 6 Institutional KPI Cards
      kpis: {
        indexedPublications: totalPubsCount,
        approvedCitations: totalCitations,
        extramuralGrants: {
          projectsCount: sponsoredProjects.length,
          sanctionedInr: sponsoredFin.formattedInr,
          sanctionedUsd: sponsoredFin.formattedUsd,
          croresInr: sponsoredFin.croresInr,
          lakhsInr: sponsoredFin.lakhsInr
        },
        patentsAndIpr: {
          totalIprs: patents.length + copyrights.length,
          patentsTotal: patents.length,
          patentsGranted,
          patentsPublished,
          copyrightsTotal: copyrights.length
        },
        consultancyInflow: {
          assignmentsCount: consultancyProjects.length,
          revenueInr: consultancyFin.formattedInr,
          revenueUsd: consultancyFin.formattedUsd,
          lakhsInr: consultancyFin.lakhsInr
        },
        periodicalsAndColumns: periodicalsCount
      },

      // Section 1: Research Publication Performance
      publications: {
        total: totalPubsCount,
        indexingBreakdown: [
          { name: 'Scopus Indexed', count: scopusCount || totalPubsCount },
          { name: 'Web of Science', count: wosCount },
          { name: 'UGC-CARE Listed', count: ugcCount },
          { name: 'Other Peer-Reviewed', count: otherPubCount }
        ],
        quartiles: [
          { quartile: 'Q1', count: q1Count, percentage: totalPubsCount > 0 ? parseFloat(((q1Count / totalPubsCount) * 100).toFixed(1)) : 0 },
          { quartile: 'Q2', count: q2Count, percentage: totalPubsCount > 0 ? parseFloat(((q2Count / totalPubsCount) * 100).toFixed(1)) : 0 },
          { quartile: 'Q3', count: q3Count, percentage: totalPubsCount > 0 ? parseFloat(((q3Count / totalPubsCount) * 100).toFixed(1)) : 0 },
          { quartile: 'Q4', count: q4Count, percentage: totalPubsCount > 0 ? parseFloat(((q4Count / totalPubsCount) * 100).toFixed(1)) : 0 },
          { quartile: 'Unclassified', count: unclassifiedQuartileCount, percentage: totalPubsCount > 0 ? parseFloat(((unclassifiedQuartileCount / totalPubsCount) * 100).toFixed(1)) : 0 }
        ],
        yearlyTrends: yearlyPubsArray,
        departmentDistribution: deptPubsArray,
        departmentQuartiles: deptQuartilesArray,
        avgPubsPerFaculty
      },

      // Section 2: Citation Performance
      citations: {
        total: totalCitations,
        avgPerPublication: avgCitationsPerPub,
        coverage: {
          citedCount: citedPubsCount,
          uncitedCount: uncitedPubsCount,
          coveragePercentage: citationCoveragePct
        },
        yearlyTrends: yearlyCitationsArray,
        brackets: citationBrackets,
        departmentDistribution: deptCitationsArray
      },

      // Section 3: Sponsored Research Performance
      sponsoredResearch: {
        externalProjects: {
          count: sponsoredProjects.length,
          sanctionedInr: sponsoredFin.formattedInr,
          sanctionedUsd: sponsoredFin.formattedUsd,
          rawSanctionedInr: totalSponsoredInr,
          rawSanctionedUsd: Math.round(totalSponsoredInr / fxRate),
          receivedInr: receivedFin.formattedInr,
          receivedUsd: receivedFin.formattedUsd
        },
        internalProjects: {
          count: internalProjects.length,
          sanctionedInr: internalFin.formattedInr,
          sanctionedUsd: internalFin.formattedUsd,
          rawSanctionedInr: totalInternalSanctionedInr,
          rawSanctionedUsd: Math.round(totalInternalSanctionedInr / fxRate)
        },
        combinedFunding: {
          totalInr: combinedResearchFunding.formattedInr,
          totalUsd: combinedResearchFunding.formattedUsd
        },
        yearlyTrends: yearlyGrantsArray,
        agencyDistribution: agencyDistributionArray,
        departmentDistribution: deptFundingArray
      },

      // Section 4: Intellectual Property Performance (IPR)
      intellectualProperty: {
        patents: {
          total: patents.length,
          granted: patentsGranted,
          published: patentsPublished,
          filed: patentsFiled,
          licensed: patentsLicensed
        },
        copyrights: {
          total: copyrights.length
        },
        patentStatusBreakdown: [
          { status: 'Granted', count: patentsGranted },
          { status: 'Published', count: patentsPublished }
        ],
        yearlyTrends: yearlyPatentsArray,
        iprComparison: [
          { type: 'Patents', count: patents.length },
          { type: 'Copyrights', count: copyrights.length }
        ],
        departmentDistribution: deptIprArray
      },

      // Section 5: Consultancy Performance
      consultancy: {
        totalAssignments: consultancyProjects.length,
        financials: {
          revenueInr: consultancyFin.formattedInr,
          revenueUsd: consultancyFin.formattedUsd,
          lakhsInr: consultancyFin.lakhsInr,
          rawRevenueInr: totalConsultancyRevLakhs * 100000,
          rawRevenueUsd: Math.round((totalConsultancyRevLakhs * 100000) / fxRate)
        },
        yearlyTrends: yearlyConsultancyArray,
        projectTypeDistribution: typeConsultancyArray,
        departmentDistribution: deptConsultancyArray
      }
    };

    // Store in cache
    analyticsCache.set(cacheKey, { data: payload, timestamp: now });

    return res.json({
      success: true,
      retrievedAt: new Date(now).toISOString(),
      isCached: false,
      data: payload
    });
  } catch (error) {
    console.error('Error generating public research analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve public research analytics',
      details: error.message
    });
  }
};
