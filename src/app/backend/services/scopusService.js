'use strict';

const { Op } = require('sequelize');
const { ScopusSource, Publication, PublicationCitationSnapshot, CitationYearlyDetail, PublicationFaculty, Faculty } = require('../models');

/**
 * Normalizes DOI string by removing URL prefixes and trimming whitespace.
 */
function normalizeDoi(val) {
  if (!val) return null;
  let cleaned = String(val).trim();
  cleaned = cleaned.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  cleaned = cleaned.replace(/^doi:\s*/i, '');
  cleaned = cleaned.trim();
  return cleaned || null;
}

/**
 * Normalizes ISSN string to 8-character or hyphenated XXXX-XXXX format.
 */
function normalizeIssn(val) {
  if (!val) return null;
  const cleaned = String(val).replace(/[^0-9Xx]/g, '').toUpperCase();
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return cleaned || null;
}

/**
 * Calculates Scopus CiteScore Quartile from percentile.
 * 75-100: Q1
 * 50-74:  Q2
 * 25-49:  Q3
 * 0-24:   Q4
 */
function calculateQuartileFromPercentile(percentile) {
  const p = parseFloat(percentile);
  if (isNaN(p)) return null;
  if (p >= 75) return 'Q1';
  if (p >= 50) return 'Q2';
  if (p >= 25) return 'Q3';
  return 'Q4';
}

/**
 * Determines the best quartile among a list of quartiles.
 * Q1 > Q2 > Q3 > Q4
 */
function resolveBestQuartile(quartiles) {
  const valid = (quartiles || []).filter(Boolean);
  if (valid.includes('Q1')) return 'Q1';
  if (valid.includes('Q2')) return 'Q2';
  if (valid.includes('Q3')) return 'Q3';
  if (valid.includes('Q4')) return 'Q4';
  return null;
}

/**
 * Searches Scopus for a publication using DOI (priority 1), Scopus EID (priority 2),
 * or Title + Year (priority 3).
 */
async function lookupScopusCitations({ doi, title, publicationYear, eid }) {
  const apiKey = (process.env.ELSEVIER_API_KEY || '').trim();
  const cleanDoi = normalizeDoi(doi);
  const cleanTitle = title ? String(title).trim() : '';
  const searchYear = publicationYear ? parseInt(String(publicationYear).match(/\b(19\d\d|20\d\d)\b/)?.[1] || '', 10) : null;

  if (!apiKey) {
    return {
      success: false,
      status: 'Not Available',
      message: 'ELSEVIER_API_KEY is not configured in backend environment.'
    };
  }

  let query = '';
  let matchMethod = 'doi';

  if (cleanDoi) {
    query = `DOI("${cleanDoi}")`;
    matchMethod = 'doi';
  } else if (eid) {
    query = `EID(${eid})`;
    matchMethod = 'eid';
  } else if (cleanTitle && searchYear) {
    const safeTitle = cleanTitle.replace(/"/g, '\\"');
    query = `TITLE("${safeTitle}") AND PUBYEAR IS ${searchYear}`;
    matchMethod = 'title_year';
  } else if (cleanTitle) {
    const safeTitle = cleanTitle.replace(/"/g, '\\"');
    query = `TITLE("${safeTitle}")`;
    matchMethod = 'title_only';
  } else {
    return {
      success: false,
      status: 'Not Indexed',
      message: 'No DOI, Scopus EID, or Title available for Scopus lookup.'
    };
  }

  const url = `https://api.elsevier.com/content/search/scopus?query=${encodeURIComponent(query)}&count=5&field=citedby-count,prism:doi,eid,dc:identifier,prism:url,prism:publicationName,prism:issn,dc:title`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-ELS-APIKey': apiKey,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    const rateLimitReset = response.headers.get('x-ratelimit-reset');

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        status: 'Lookup Failed',
        statusCode: response.status,
        message: `Elsevier API unauthorized (HTTP ${response.status}). Key may lack required entitlement.`
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        status: 'Lookup Failed',
        statusCode: 429,
        message: 'Elsevier API rate limit reached. Please retry later.'
      };
    }

    if (!response.ok) {
      return {
        success: false,
        status: 'Lookup Failed',
        statusCode: response.status,
        message: `Elsevier API returned HTTP error ${response.status}.`
      };
    }

    const data = await response.json();
    const searchResults = data['search-results'];
    const totalResults = parseInt(searchResults?.['opensearch:totalResults'] || '0', 10);
    const entries = searchResults?.entry || [];

    if (totalResults === 0 || entries.length === 0 || entries[0]?.error) {
      return {
        success: true,
        status: 'Not Indexed',
        citationCount: null,
        message: 'Publication not indexed in Scopus database.'
      };
    }

    // Ambiguity checks for non-DOI matching
    if ((matchMethod === 'title_year' || matchMethod === 'title_only') && totalResults > 1) {
      return {
        success: false,
        status: 'Verification Required',
        matchMethod,
        message: `Ambiguous match: Scopus returned ${totalResults} candidate records for this title.`
      };
    }

    const entry = entries[0];

    // Verify DOI matches when querying by DOI
    if (cleanDoi && entry['prism:doi']) {
      const returnedDoi = normalizeDoi(entry['prism:doi']);
      if (returnedDoi && returnedDoi.toLowerCase() !== cleanDoi.toLowerCase()) {
        return {
          success: false,
          status: 'Verification Required',
          matchMethod,
          message: `Mismatch between query DOI (${cleanDoi}) and returned Scopus record DOI (${returnedDoi}).`
        };
      }
    }

    const rawCitedBy = entry['citedby-count'];
    let citationCount = 0;
    if (rawCitedBy !== undefined && rawCitedBy !== null && rawCitedBy !== '') {
      const parsed = parseInt(String(rawCitedBy), 10);
      citationCount = isNaN(parsed) ? 0 : parsed;
    }

    const scopusEid = entry['eid'] || null;
    const scopusDocId = entry['dc:identifier'] || null;

    const links = Array.isArray(entry.link) ? entry.link : [];
    const scopusUrl = links.find(l => l['@ref'] === 'scopus')?.['@href'] || (scopusEid ? `https://www.scopus.com/inward/record.uri?partnerID=HzOxMe3b&scp=${scopusEid.replace(/^2-s2\.0-/, '')}&origin=inward` : null);
    const scopusCitedByUrl = links.find(l => l['@ref'] === 'scopus-citedby')?.['@href'] || (scopusEid ? `https://www.scopus.com/inward/citedby.uri?partnerID=HzOxMe3b&scp=${scopusEid.replace(/^2-s2\.0-/, '')}&origin=inward` : null);

    return {
      success: true,
      status: 'Available',
      citationCount,
      scopusEid,
      scopusDocId,
      scopusUrl,
      scopusCitedByUrl,
      matchMethod,
      rateLimitRemaining,
      rateLimitReset
    };
  } catch (err) {
    return {
      success: false,
      status: 'Lookup Failed',
      message: `Network error connecting to Scopus API: ${err.message}`
    };
  }
}

/**
 * Retrieves Year-wise Citation Breakdown using Scopus Citation Overview API.
 * Calls:
 * 1. Series A: All citations
 * 2. Series B: Citations excluding self-citations (citation=exclude-self)
 * 
 * If the API returns 403 (unauthorized key), gracefully reports 'Access Restricted'
 * without fabricating zero or fake data.
 */
async function lookupPublicationAnnualCitations({ scopusEid, doi }) {
  const apiKey = (process.env.ELSEVIER_API_KEY || '').trim();
  if (!apiKey) {
    return {
      success: false,
      status: 'Not Available',
      message: 'ELSEVIER_API_KEY is not configured.'
    };
  }

  const scopusId = scopusEid ? scopusEid.replace(/^2-s2\.0-/, '') : null;
  const cleanDoi = normalizeDoi(doi);

  if (!scopusId && !cleanDoi) {
    return {
      success: false,
      status: 'Not Available',
      message: 'Scopus EID or DOI required for Citation Overview retrieval.'
    };
  }

  // Endpoints: test standard Scopus Citation Overview
  const baseUrl = 'https://api.elsevier.com/content/abstract/citations';
  const param = scopusId ? `scopus_id=${encodeURIComponent(scopusId)}` : `doi=${encodeURIComponent(cleanDoi)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Call Series A: All citations
    const resAll = await fetch(`${baseUrl}?${param}`, {
      method: 'GET',
      headers: { 'X-ELS-APIKey': apiKey, 'Accept': 'application/json' },
      signal: controller.signal
    });

    if (resAll.status === 403 || resAll.status === 401) {
      clearTimeout(timeout);
      return {
        success: false,
        status: 'Access Restricted',
        statusCode: resAll.status,
        message: 'Scopus Citation Overview API access is restricted for this API key (requires institutional entitlement or token).'
      };
    }

    if (!resAll.ok) {
      clearTimeout(timeout);
      return {
        success: false,
        status: 'Lookup Failed',
        statusCode: resAll.status,
        message: `Citation Overview API returned HTTP error ${resAll.status}.`
      };
    }

    const dataAll = await resAll.json();

    // Call Series B: Excluding self-citations
    let dataExSelf = null;
    try {
      const resExSelf = await fetch(`${baseUrl}?${param}&citation=exclude-self`, {
        method: 'GET',
        headers: { 'X-ELS-APIKey': apiKey, 'Accept': 'application/json' }
      });
      if (resExSelf.ok) {
        dataExSelf = await resExSelf.json();
      }
    } catch (exErr) {
      console.warn('[ScopusService] Excluding self citation retrieval skipped:', exErr.message);
    }
    clearTimeout(timeout);

    // Parse citation matrix from response
    // Response structure from Elsevier specification:
    // citations-overview-response -> citeInfoMatrix -> citeInfoXML -> citationMatrix -> citeInfo
    const overview = dataAll['citations-overview-response'] || dataAll['citation-overview-response'] || {};
    const matrix = overview.citeInfoMatrix?.citeInfoXML?.citationMatrix?.citeInfo || [];
    const matrixArr = Array.isArray(matrix) ? matrix : [matrix];

    const exSelfOverview = dataExSelf ? (dataExSelf['citations-overview-response'] || dataExSelf['citation-overview-response'] || {}) : null;
    const exSelfMatrix = exSelfOverview?.citeInfoMatrix?.citeInfoXML?.citationMatrix?.citeInfo || [];
    const exSelfArr = Array.isArray(exSelfMatrix) ? exSelfMatrix : [exSelfMatrix];

    const exSelfMap = new Map();
    exSelfArr.forEach(item => {
      const yr = String(item.rangeYear || item['@year'] || '').trim();
      const count = parseInt(String(item.citationCount || item['$'] || '0'), 10);
      if (yr) exSelfMap.set(yr, isNaN(count) ? 0 : count);
    });

    const yearlyRecords = [];
    matrixArr.forEach(item => {
      const yr = String(item.rangeYear || item['@year'] || '').trim();
      if (!yr) return;
      const count = parseInt(String(item.citationCount || item['$'] || '0'), 10);
      const allCount = isNaN(count) ? 0 : count;
      const exCount = exSelfMap.has(yr) ? exSelfMap.get(yr) : null;

      yearlyRecords.push({
        period: yr,
        citationCount: allCount,
        excludingSelfCount: exCount,
        periodType: 'year',
        source: 'Scopus'
      });
    });

    return {
      success: true,
      status: 'Available',
      yearlyRecords
    };
  } catch (err) {
    return {
      success: false,
      status: 'Lookup Failed',
      message: `Error connecting to Citation Overview API: ${err.message}`
    };
  }
}

/**
 * Retrieves and synchronizes both Total Citations and Annual Citations for a Publication.
 * Safeguards:
 * - Identifies actual verified faculty (EmpID + Name) from PublicationFaculty or Faculty.
 * - Does NOT hardcode SCOPUS_API!
 * - Never overwrites existing valid citation count if API request fails.
 * - Creates a snapshot in PublicationCitationSnapshot for historical audit.
 */
async function retrievePublicationCitations(publicationId) {
  try {
    const pub = await Publication.findByPk(publicationId);
    if (!pub) return null;

    const previousCount = pub.citationCount;

    if (pub.journalType && pub.journalType.toLowerCase().includes('wos') && !pub.journalType.toLowerCase().includes('scopus')) {
      pub.citationStatus = 'Not Available';
      pub.citationError = 'Publication is not indexed under Scopus.';
      pub.lastCitationRefreshAt = new Date();
      pub.nextCitationRefreshAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pub.save();
      return pub;
    }

    // 1. Look up verified faculty member for proper attribution
    let verifiedEmpId = null;
    let verifiedFacultyName = null;
    try {
      const pf = await PublicationFaculty.findOne({
        where: { publicationId: pub.id },
        order: [['createdAt', 'ASC']]
      });
      if (pf) {
        verifiedEmpId = pf.employeeId;
        verifiedFacultyName = pf.facultyName;
      } else if (pub.createdBy) {
        const fac = await Faculty.findOne({ where: { userId: pub.createdBy } });
        if (fac) {
          verifiedEmpId = fac.employeeId;
          verifiedFacultyName = fac.name;
        }
      }
    } catch (facErr) {
      console.warn('[ScopusService] Notice resolving faculty identity:', facErr.message);
    }

    // 2. Query Scopus for Document Identifier and Total Citations
    const resTotal = await lookupScopusCitations({
      doi: pub.doi,
      title: pub.title,
      publicationYear: pub.publicationYear || pub.academicYear,
      eid: pub.scopusEid
    });

    const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (resTotal.success && resTotal.status === 'Available') {
      pub.citationCount = resTotal.citationCount; // 0 is valid!
      pub.citationStatus = 'Available';
      pub.scopusEid = resTotal.scopusEid || pub.scopusEid;
      pub.scopusDocId = resTotal.scopusDocId || pub.scopusDocId;
      pub.scopusUrl = resTotal.scopusUrl || pub.scopusUrl;
      pub.scopusCitedByUrl = resTotal.scopusCitedByUrl || pub.scopusCitedByUrl;
      pub.citationMatchMethod = resTotal.matchMethod || pub.citationMatchMethod;
      pub.citationError = null;
      pub.lastCitationRefreshAt = new Date();
      pub.nextCitationRefreshAt = oneWeekLater;

      // 3. Query Scopus for Annual Time-Series Citations
      let annualRecords = [];
      const resAnnual = await lookupPublicationAnnualCitations({
        scopusEid: pub.scopusEid,
        doi: pub.doi
      });
      if (resAnnual.success && Array.isArray(resAnnual.yearlyRecords) && resAnnual.yearlyRecords.length > 0) {
        annualRecords = resAnnual.yearlyRecords;
      }

      // Find previous snapshot that has yearly details to preserve verified historical time series
      let prevSnapshotWithDetails = null;
      try {
        prevSnapshotWithDetails = await PublicationCitationSnapshot.findOne({
          where: { publicationId: pub.id },
          include: [{
            model: CitationYearlyDetail,
            as: 'yearlyDetails'
          }],
          order: [['createdAt', 'DESC']]
        });
      } catch (findErr) {
        console.warn('[ScopusCitation] Notice finding previous snapshot:', findErr.message);
      }

      // 4. Create historical snapshot with verified faculty identity
      try {
        const snapshot = await PublicationCitationSnapshot.create({
          publicationId: pub.id,
          sourceFile: 'Scopus API Live Retrieval',
          employeeId: verifiedEmpId || 'Institutional Research',
          facultyName: verifiedFacultyName || null,
          citationSource: 'Scopus',
          reportedTotal: resTotal.citationCount,
          previousTotal: previousCount !== null && previousCount !== undefined ? previousCount : null,
          reconciliationStatus: 'reconciled',
          approvalStatus: 'approved',
          reportDate: new Date()
        });

        // Insert annual breakdown rows if retrieved, or carry forward existing verified breakdown
        let detailRows = [];
        if (annualRecords.length > 0) {
          detailRows = annualRecords.map(r => ({
            snapshotId: snapshot.id,
            period: r.period,
            citationCount: r.citationCount,
            excludingSelfCount: r.excludingSelfCount,
            periodType: r.periodType || 'year',
            citationType: 'all',
            source: 'Scopus',
            status: 'known'
          }));
        } else if (prevSnapshotWithDetails && Array.isArray(prevSnapshotWithDetails.yearlyDetails) && prevSnapshotWithDetails.yearlyDetails.length > 0) {
          const currentYearStr = new Date().getFullYear().toString();
          const prevTotal = prevSnapshotWithDetails.reportedTotal || 0;
          const diff = (resTotal.citationCount || 0) - prevTotal;

          detailRows = prevSnapshotWithDetails.yearlyDetails.map(yd => {
            let count = yd.citationCount;
            if (diff > 0 && String(yd.period).trim() === currentYearStr) {
              count = (count || 0) + diff;
            }
            return {
              snapshotId: snapshot.id,
              period: yd.period,
              citationCount: count,
              excludingSelfCount: yd.excludingSelfCount,
              periodType: yd.periodType,
              citationType: yd.citationType || 'all',
              source: yd.source || 'Scopus',
              status: yd.status || 'known'
            };
          });

          if (diff > 0 && !detailRows.some(d => String(d.period).trim() === currentYearStr)) {
            detailRows.push({
              snapshotId: snapshot.id,
              period: currentYearStr,
              citationCount: diff,
              excludingSelfCount: null,
              periodType: 'year',
              citationType: 'all',
              source: 'Scopus',
              status: 'known'
            });
          }
        }

        if (snapshot && detailRows.length > 0) {
          await CitationYearlyDetail.bulkCreate(detailRows);
        }
      } catch (snapErr) {
        console.warn('[ScopusCitation] Error creating citation snapshot:', snapErr.message);
      }
    } else if (resTotal.status === 'Not Indexed') {
      pub.citationStatus = 'Not Indexed';
      pub.citationError = resTotal.message || 'Publication not found in Scopus index.';
      pub.lastCitationRefreshAt = new Date();
      pub.nextCitationRefreshAt = oneWeekLater;
    } else if (resTotal.status === 'Verification Required') {
      pub.citationStatus = 'Verification Required';
      pub.citationError = resTotal.message;
      pub.lastCitationRefreshAt = new Date();
      pub.nextCitationRefreshAt = oneWeekLater;
    } else {
      // Lookup Failed or Not Available:
      // CRITICAL: NEVER overwrite previous valid citation count!
      pub.citationStatus = resTotal.status || 'Lookup Failed';
      pub.citationError = resTotal.message || 'Failed to retrieve citation count from Scopus.';
      pub.lastCitationRefreshAt = new Date();
      pub.nextCitationRefreshAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    await pub.save();
    return pub;
  } catch (err) {
    console.error(`[ScopusCitation] Citation retrieval error for publication ${publicationId}:`, err.message);
    return null;
  }
}

/**
 * Searches Serial Title candidates using Journal Title or ISSN.
 * Used for interactive administrator confirmation of ambiguous journals.
 */
async function searchJournalCandidates(queryText) {
  const apiKey = (process.env.ELSEVIER_API_KEY || '').trim();
  if (!apiKey || !queryText) return [];

  const clean = String(queryText).trim();
  const isIssn = /^\d{4}-?\d{3}[\dX]$/i.test(clean);
  const url = isIssn
    ? `https://api.elsevier.com/content/serial/title/issn/${encodeURIComponent(normalizeIssn(clean))}?view=STANDARD&count=10`
    : `https://api.elsevier.com/content/serial/title?title=${encodeURIComponent(clean)}&view=STANDARD&count=10`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-ELS-APIKey': apiKey, 'Accept': 'application/json' }
    });
    if (!res.ok) return [];

    const json = await res.json();
    const entries = json?.['serial-metadata-response']?.entry || [];
    const entryList = Array.isArray(entries) ? entries : [entries];

    return entryList.filter(e => e && !e.error).map(e => ({
      sourceTitle: e['dc:title'],
      scopusSourceId: e['source-id'],
      issn: e['prism:issn'] || null,
      eIssn: e['prism:eIssn'] || null,
      publisher: e['dc:publisher'] || null,
      sourceType: e['prism:aggregationType'] || 'Journal',
      scopusUrl: `https://www.scopus.com/sourceid/${e['source-id']}`
    }));
  } catch (err) {
    console.warn('[ScopusService] Journal search error:', err.message);
    return [];
  }
}

/**
 * Retrieves comprehensive Journal-Level Metrics from Elsevier Serial Title API:
 * - CiteScore Current Metric & Tracker
 * - Complete Historical CiteScore by year
 * - Category-specific Percentiles and Ranks
 * - Annual Scholarly Output document counts by year
 * - Annual SJR by year
 * - Annual SNIP by year
 * - Subject Area classifications
 */
async function retrieveJournalMetrics({ scopusSourceId, issn, journalTitle }) {
  const apiKey = (process.env.ELSEVIER_API_KEY || '').trim();
  const cleanId = scopusSourceId ? String(scopusSourceId).trim() : null;
  const normIssn = normalizeIssn(issn);
  const cleanTitle = journalTitle ? String(journalTitle).trim() : '';

  if (!apiKey) {
    return {
      success: false,
      status: 'Not Available',
      message: 'ELSEVIER_API_KEY is not configured in backend environment.'
    };
  }

  let apiUrl = null;
  if (cleanId) {
    apiUrl = `https://api.elsevier.com/content/serial/title?source-id=${encodeURIComponent(cleanId)}&view=CITESCORE`;
  } else if (normIssn) {
    apiUrl = `https://api.elsevier.com/content/serial/title/issn/${encodeURIComponent(normIssn)}?view=CITESCORE`;
  } else if (cleanTitle) {
    apiUrl = `https://api.elsevier.com/content/serial/title?title=${encodeURIComponent(cleanTitle)}&view=CITESCORE`;
  } else {
    return {
      success: false,
      status: 'Verification Required',
      message: 'No Journal Title, ISSN, or Scopus Source ID provided.'
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'X-ELS-APIKey': apiKey, 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        status: 'Lookup Failed',
        message: `Elsevier API unauthorized (HTTP ${response.status}). Check API key entitlement.`
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        status: 'Not Indexed',
        message: 'Journal/Serial title not found in Scopus.'
      };
    }

    if (!response.ok) {
      return {
        success: false,
        status: 'Lookup Failed',
        message: `Elsevier API returned HTTP error ${response.status}.`
      };
    }

    const json = await response.json();
    const serialMeta = json?.['serial-metadata-response'];
    const entries = serialMeta?.entry || [];
    let entry = Array.isArray(entries) ? entries[0] : entries;

    if (Array.isArray(entries) && cleanTitle && entries.length > 1) {
      const targetLower = cleanTitle.toLowerCase().trim();
      const exactMatch = entries.find(e => (e['dc:title'] || '').toLowerCase().trim() === targetLower);
      if (exactMatch) {
        entry = exactMatch;
      }
    }

    if (!entry || entry.error) {
      return {
        success: false,
        status: 'Not Indexed',
        message: entry?.error || 'Source not found in Scopus database.'
      };
    }

    const foundSourceId = entry['source-id'] || cleanId;
    const sourceTitle = entry['dc:title'] || cleanTitle;
    const foundIssn = entry['prism:issn'] || normIssn;
    const foundEIssn = entry['prism:eIssn'] || null;
    const publisher = entry['dc:publisher'] || null;
    const sourceType = entry['prism:aggregationType'] || 'Journal';
    const scopusUrl = `https://www.scopus.com/sourceid/${foundSourceId}`;

    // Subject area code-to-name lookup
    const subjectAreaList = entry['subject-area'] || [];
    const codeMap = {};
    const subjectAreas = [];
    (Array.isArray(subjectAreaList) ? subjectAreaList : [subjectAreaList]).forEach(sa => {
      if (sa && sa['@code']) {
        const code = String(sa['@code']);
        const name = sa['$'] || sa.name || `Subject ${code}`;
        codeMap[code] = name;
        subjectAreas.push({ code, name, abbrev: sa['@abbrev'] || null });
      }
    });

    // SJR List
    const sjrByYear = {};
    const sjrList = entry.SJRList?.SJR || [];
    (Array.isArray(sjrList) ? sjrList : [sjrList]).forEach(s => {
      if (s && s['@year'] && s['$']) {
        const yr = parseInt(s['@year'], 10);
        const val = parseFloat(s['$']);
        if (!isNaN(yr) && !isNaN(val)) sjrByYear[yr] = val;
      }
    });

    // SNIP List
    const snipByYear = {};
    const snipList = entry.SNIPList?.SNIP || [];
    (Array.isArray(snipList) ? snipList : [snipList]).forEach(s => {
      if (s && s['@year'] && s['$']) {
        const yr = parseInt(s['@year'], 10);
        const val = parseFloat(s['$']);
        if (!isNaN(yr) && !isNaN(val)) snipByYear[yr] = val;
      }
    });

    // CiteScores and Scholarly Output by Year
    const citeScoresByYear = {};
    const scholarlyOutputByYear = {};
    const yearInfoList = entry.citeScoreYearInfoList?.citeScoreYearInfo || [];

    const currentMetricVal = entry.citeScoreYearInfoList?.citeScoreCurrentMetric ? parseFloat(entry.citeScoreYearInfoList.citeScoreCurrentMetric) : null;
    const currentMetricYear = entry.citeScoreYearInfoList?.citeScoreCurrentMetricYear ? parseInt(entry.citeScoreYearInfoList.citeScoreCurrentMetricYear, 10) : null;
    const trackerVal = entry.citeScoreYearInfoList?.citeScoreTracker ? parseFloat(entry.citeScoreYearInfoList.citeScoreTracker) : null;
    const trackerYear = entry.citeScoreYearInfoList?.citeScoreTrackerYear ? parseInt(entry.citeScoreYearInfoList.citeScoreTrackerYear, 10) : null;

    yearInfoList.forEach(yInfo => {
      const yr = parseInt(yInfo['@year'], 10);
      if (!yr) return;

      const status = yInfo['@status'] || 'Unknown';
      let metricValue = null;
      let docCount = null;
      let citCount = null;
      const categories = [];

      const infoList = yInfo.citeScoreInformationList || [];
      infoList.forEach(info => {
        const catList = info.citeScoreInfo || [];
        (Array.isArray(catList) ? catList : [catList]).forEach(cat => {
          if (cat.citeScore && metricValue === null) metricValue = parseFloat(cat.citeScore);
          if (cat.scholarlyOutput && docCount === null) docCount = parseInt(cat.scholarlyOutput, 10);
          if (cat.citationCount && citCount === null) citCount = parseInt(cat.citationCount, 10);

          const ranks = cat.citeScoreSubjectRank || [];
          (Array.isArray(ranks) ? ranks : [ranks]).forEach(sr => {
            const code = String(sr.subjectCode || sr['@code'] || '');
            const catName = codeMap[code] || sr.subjectName || sr['$'] || (code ? `Subject ${code}` : 'General');
            const rank = sr.rank ? parseInt(sr.rank, 10) : null;
            const rankTotal = sr.rankTotal ? parseInt(sr.rankTotal, 10) : null;
            const percentile = sr.percentile ? parseFloat(sr.percentile) : null;
            const q = percentile !== null ? calculateQuartileFromPercentile(percentile) : null;

            categories.push({
              category: catName,
              code,
              rank,
              rankTotal,
              percentile,
              quartile: q
            });
          });
        });
      });

      if (metricValue === null) {
        const cur = yInfo.citeScoreCurrentMetric ? parseFloat(yInfo.citeScoreCurrentMetric) : null;
        const trk = yInfo.citeScoreTracker ? parseFloat(yInfo.citeScoreTracker) : null;
        metricValue = cur !== null ? cur : trk;
      }

      const bestQuartile = resolveBestQuartile(categories.map(c => c.quartile));

      citeScoresByYear[yr] = {
        year: yr,
        status,
        citeScore: metricValue,
        citationCount: citCount,
        scholarlyOutput: docCount,
        bestQuartile,
        categories
      };

      if (docCount !== null) {
        scholarlyOutputByYear[yr] = docCount;
      }
    });

    // Determine current complete CiteScore and tracker
    const completeYears = Object.keys(citeScoresByYear)
      .map(Number)
      .filter(y => citeScoresByYear[y]?.status?.toLowerCase() === 'complete')
      .sort((a, b) => b - a);

    const latestCompleteYear = completeYears[0] || currentMetricYear || null;
    const latestCompleteData = latestCompleteYear ? citeScoresByYear[latestCompleteYear] : null;

    // Monthly refresh: next refresh is 30 days later
    const nextRefreshAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Save or update central ScopusSource table
    let savedSource = null;
    try {
      [savedSource] = await ScopusSource.upsert({
        scopusSourceId: foundSourceId,
        sourceTitle,
        issn: foundIssn,
        eIssn: foundEIssn,
        publisher,
        sourceType,
        scopusUrl,
        subjectAreas,
        citeScoresByYear,
        sjrByYear,
        snipByYear,
        scholarlyOutputByYear,
        lastFetchedAt: new Date(),
        nextRefreshAt,
        lastRefreshStatus: 'Available'
      }, { returning: true });
    } catch (upsertErr) {
      console.warn('[ScopusService] Error updating ScopusSource record:', upsertErr.message);
    }

    return {
      success: true,
      status: 'Available',
      scopusSourceId: foundSourceId,
      sourceTitle,
      issn: foundIssn,
      eIssn: foundEIssn,
      publisher,
      sourceType,
      scopusUrl,
      currentCiteScore: {
        value: currentMetricVal !== null ? currentMetricVal : latestCompleteData?.citeScore,
        year: currentMetricYear || latestCompleteYear,
        bestQuartile: latestCompleteData?.bestQuartile || null,
        categories: latestCompleteData?.categories || []
      },
      trackerCiteScore: {
        value: trackerVal !== null ? trackerVal : (citeScoresByYear[trackerYear]?.citeScore || null),
        year: trackerYear,
        status: 'In-Progress'
      },
      citeScoresByYear,
      scholarlyOutputByYear,
      sjrByYear,
      snipByYear,
      subjectAreas,
      lastFetchedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('[ScopusService] Error retrieving journal metrics:', err.message);
    return {
      success: false,
      status: 'Lookup Failed',
      message: `Error connecting to Elsevier API: ${err.message}`
    };
  }
}

/**
 * Core lookup function for Journal Scopus CiteScore and Quartiles.
 * Reuses central ScopusSource cache table.
 */
async function lookupJournalCiteScore({ issn, journalTitle, targetYear }) {
  const normIssn = normalizeIssn(issn);
  const cleanTitle = journalTitle ? String(journalTitle).trim() : '';
  const searchYear = targetYear ? parseInt(String(targetYear).match(/\b(19\d\d|20\d\d)\b/)?.[1] || '', 10) : null;

  // 1. Check local ScopusSource table
  try {
    let cachedSource = null;
    if (normIssn) {
      cachedSource = await ScopusSource.findOne({
        where: {
          [Op.or]: [
            { issn: normIssn },
            { eIssn: normIssn },
            { issn: normIssn.replace('-', '') },
            { eIssn: normIssn.replace('-', '') }
          ]
        }
      });
    }

    if (!cachedSource && cleanTitle) {
      cachedSource = await ScopusSource.findOne({
        where: ScopusSource.sequelize.where(
          ScopusSource.sequelize.fn('LOWER', ScopusSource.sequelize.col('sourceTitle')),
          cleanTitle.toLowerCase()
        )
      });
    }

    if (cachedSource && cachedSource.citeScoresByYear && Object.keys(cachedSource.citeScoresByYear).length > 0) {
      const yearInfo = selectYearData(cachedSource.citeScoresByYear, searchYear);
      if (yearInfo) {
        return {
          success: true,
          status: 'Available',
          cached: true,
          scopusSourceId: cachedSource.scopusSourceId,
          sourceTitle: cachedSource.sourceTitle,
          issn: cachedSource.issn || normIssn,
          eIssn: cachedSource.eIssn,
          publisher: cachedSource.publisher,
          sourceType: cachedSource.sourceType,
          scopusUrl: cachedSource.scopusUrl,
          ...yearInfo
        };
      }
    }
  } catch (cacheErr) {
    console.warn('[ScopusService] Cache query error:', cacheErr.message);
  }

  // 2. Fetch fresh journal metrics from Elsevier
  const res = await retrieveJournalMetrics({ issn: normIssn, journalTitle: cleanTitle });
  if (res.success && res.citeScoresByYear) {
    const yearInfo = selectYearData(res.citeScoresByYear, searchYear);
    return {
      success: true,
      status: 'Available',
      scopusSourceId: res.scopusSourceId,
      sourceTitle: res.sourceTitle,
      issn: res.issn,
      eIssn: res.eIssn,
      publisher: res.publisher,
      sourceType: res.sourceType,
      scopusUrl: res.scopusUrl,
      ...(yearInfo || {
        citeScoreYear: searchYear,
        citeScoreValue: res.currentCiteScore?.value,
        quartile: res.currentCiteScore?.bestQuartile,
        categories: res.currentCiteScore?.categories || [],
        metricStatus: 'Current'
      })
    };
  }

  return res;
}

function selectYearData(citeScoresByYear, searchYear) {
  if (!citeScoresByYear || typeof citeScoresByYear !== 'object') return null;

  if (searchYear && citeScoresByYear[searchYear]) {
    const yrData = citeScoresByYear[searchYear];
    return {
      citeScoreYear: searchYear,
      citeScoreValue: yrData.citeScore,
      quartile: yrData.bestQuartile,
      categories: yrData.categories || [],
      metricStatus: yrData.status
    };
  }

  const years = Object.keys(citeScoresByYear)
    .map(Number)
    .filter(y => !isNaN(y))
    .sort((a, b) => b - a);

  if (years.length === 0) return null;

  const completeYear = years.find(y => citeScoresByYear[y]?.status?.toLowerCase() === 'complete');
  const chosenYear = completeYear || years[0];
  const chosenData = citeScoresByYear[chosenYear];

  return {
    citeScoreYear: chosenYear,
    citeScoreValue: chosenData.citeScore,
    quartile: chosenData.bestQuartile,
    categories: chosenData.categories || [],
    metricStatus: chosenData.status
  };
}

/**
 * Enriches a single Publication record with Scopus CiteScore Quartile data.
 */
async function enrichPublicationQuartile(publicationId) {
  try {
    const pub = await Publication.findByPk(publicationId);
    if (!pub) return null;

    if (pub.journalType && pub.journalType.toLowerCase().includes('wos') && !pub.journalType.toLowerCase().includes('scopus')) {
      pub.quartileStatus = 'Not Available';
      await pub.save();
      return pub;
    }

    const res = await lookupJournalCiteScore({
      issn: pub.issn,
      journalTitle: pub.journalName,
      targetYear: pub.publicationYear || pub.academicYear
    });

    if (res.success && res.quartile) {
      pub.quartile = res.quartile;
      pub.quartileStatus = 'Available';
      pub.scopusSourceId = res.scopusSourceId || pub.scopusSourceId;
      pub.citeScoreYear = res.citeScoreYear || null;
      pub.citeScoreValue = res.citeScoreValue !== undefined ? res.citeScoreValue : null;
      pub.scopusEnrichment = {
        sourceTitle: res.sourceTitle,
        issn: res.issn,
        eIssn: res.eIssn,
        publisher: res.publisher,
        sourceType: res.sourceType,
        categories: res.categories || [],
        metricStatus: res.metricStatus,
        lastEnrichedAt: new Date().toISOString()
      };
    } else {
      pub.quartileStatus = res.status || 'Lookup Failed';
      pub.scopusEnrichment = {
        reason: res.message || 'No Scopus CiteScore metric found',
        lastAttemptAt: new Date().toISOString()
      };
    }

    await pub.save();
    return pub;
  } catch (err) {
    console.error(`[ScopusService] Enrichment failed for publication ${publicationId}:`, err.message);
    return null;
  }
}

/**
 * Scheduled Batch Processor: Refreshes publications whose citation refresh is due.
 */
async function refreshDueCitations(batchLimit = 50) {
  try {
    const duePubs = await Publication.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { doi: { [Op.ne]: null } },
              { scopusEid: { [Op.ne]: null } }
            ]
          },
          {
            [Op.or]: [
              { nextCitationRefreshAt: null },
              { nextCitationRefreshAt: { [Op.lte]: new Date() } }
            ]
          }
        ]
      },
      limit: batchLimit,
      order: [['lastCitationRefreshAt', 'ASC NULLS FIRST']]
    });

    if (duePubs.length === 0) {
      return {
        success: true,
        processedCount: 0,
        message: 'No publications currently due for citation refresh.'
      };
    }

    let refreshedCount = 0;
    let failedCount = 0;

    for (const pub of duePubs) {
      try {
        const enriched = await retrievePublicationCitations(pub.id);
        if (enriched && enriched.citationStatus === 'Available') {
          refreshedCount++;
        } else {
          failedCount++;
        }
      } catch (pErr) {
        failedCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      success: true,
      processedCount: duePubs.length,
      refreshedCount,
      failedCount,
      completedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('[CitationRefresh] Error in refreshDueCitations:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Monthly Scheduled Batch Processor for Shared Journal Metrics:
 * Refreshes unique ScopusSource records whose nextRefreshAt is due.
 * Supports forceAll option for manual administrator invocation.
 */
async function refreshDueJournalMetrics(optionsOrLimit = 25) {
  try {
    const options = typeof optionsOrLimit === 'object' ? optionsOrLimit : { batchLimit: optionsOrLimit };
    const batchLimit = options.batchLimit || 25;
    const forceAll = Boolean(options.forceAll);

    const whereClause = forceAll
      ? {}
      : {
          [Op.or]: [
            { nextRefreshAt: null },
            { nextRefreshAt: { [Op.lte]: new Date() } }
          ]
        };

    let dueSources = await ScopusSource.findAll({
      where: whereClause,
      limit: batchLimit,
      order: [['lastFetchedAt', 'ASC NULLS FIRST']]
    });

    if (dueSources.length === 0 && forceAll) {
      // Find distinct journals from existing publications if ScopusSource is empty
      const pubs = await Publication.findAll({
        attributes: ['journalName', 'issn', 'scopusSourceId'],
        where: {
          journalName: { [Op.ne]: null }
        },
        limit: batchLimit,
        raw: true
      });

      const seen = new Set();
      const uniquePubSources = [];
      for (const p of pubs) {
        const title = (p.journalName || '').trim();
        if (title && !seen.has(title.toLowerCase())) {
          seen.add(title.toLowerCase());
          uniquePubSources.push({
            scopusSourceId: p.scopusSourceId,
            issn: p.issn,
            sourceTitle: title
          });
        }
      }
      dueSources = uniquePubSources;
    }

    if (dueSources.length === 0) {
      return {
        success: true,
        processedCount: 0,
        refreshedCount: 0,
        failedCount: 0,
        message: 'No journal sources currently due for monthly metric refresh.'
      };
    }

    let refreshedCount = 0;
    let failedCount = 0;

    for (const src of dueSources) {
      try {
        const res = await retrieveJournalMetrics({
          scopusSourceId: src.scopusSourceId,
          issn: src.issn,
          journalTitle: src.sourceTitle
        });
        if (res.success && res.status === 'Available') {
          refreshedCount++;
        } else {
          failedCount++;
        }
      } catch (sErr) {
        failedCount++;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return {
      success: true,
      processedCount: dueSources.length,
      refreshedCount,
      failedCount,
      completedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('[JournalRefresh] Error in refreshDueJournalMetrics:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Diagnostics Helper for System Administrators:
 * Independently probes Scopus Search, Abstract Retrieval, Citation Overview, and Serial Title APIs.
 */
async function getScopusDiagnosticStatus() {
  const apiKey = (process.env.ELSEVIER_API_KEY || '').trim();
  if (!apiKey) {
    return {
      configured: false,
      status: 'MISSING_API_KEY',
      message: 'ELSEVIER_API_KEY is not set in backend environment (.env).'
    };
  }

  const endpoints = {};

  // 1. Scopus Search API
  try {
    const testDoi = '10.1016/j.future.2019.05.024';
    const res = await fetch(`https://api.elsevier.com/content/search/scopus?query=DOI(${encodeURIComponent(testDoi)})&count=1`, {
      method: 'GET',
      headers: { 'X-ELS-APIKey': apiKey, 'Accept': 'application/json' }
    });
    endpoints.search = {
      status: res.status,
      ok: res.ok,
      message: res.ok ? 'Operational' : `HTTP ${res.status}`
    };
  } catch (e) {
    endpoints.search = { status: 0, ok: false, message: e.message };
  }

  // 2. Abstract Retrieval API
  try {
    const res = await fetch(`https://api.elsevier.com/content/abstract/doi/10.1016/j.future.2019.05.024`, {
      method: 'GET',
      headers: { 'X-ELS-APIKey': apiKey, 'Accept': 'application/json' }
    });
    endpoints.abstractRetrieval = {
      status: res.status,
      ok: res.ok,
      message: res.ok ? 'Operational' : `HTTP ${res.status}`
    };
  } catch (e) {
    endpoints.abstractRetrieval = { status: 0, ok: false, message: e.message };
  }

  // 3. Citation Overview API
  try {
    const res = await fetch(`https://api.elsevier.com/content/abstract/citations?scopus_id=85065549688`, {
      method: 'GET',
      headers: { 'X-ELS-APIKey': apiKey, 'Accept': 'application/json' }
    });
    endpoints.citationOverview = {
      status: res.status,
      ok: res.ok,
      message: res.ok ? 'Operational' : (res.status === 403 ? 'Access Restricted (Requires Institutional Entitlement)' : `HTTP ${res.status}`)
    };
  } catch (e) {
    endpoints.citationOverview = { status: 0, ok: false, message: e.message };
  }

  // 4. Serial Title API (CITESCORE)
  try {
    const res = await fetch(`https://api.elsevier.com/content/serial/title?title=Future%20Generation%20Computer%20Systems&view=CITESCORE`, {
      method: 'GET',
      headers: { 'X-ELS-APIKey': apiKey, 'Accept': 'application/json' }
    });
    endpoints.serialTitleCiteScore = {
      status: res.status,
      ok: res.ok,
      message: res.ok ? 'Operational' : `HTTP ${res.status}`
    };
  } catch (e) {
    endpoints.serialTitleCiteScore = { status: 0, ok: false, message: e.message };
  }

  const isOverallOperational = endpoints.search?.ok && endpoints.serialTitleCiteScore?.ok;

  return {
    configured: true,
    status: isOverallOperational ? 'OPERATIONAL' : 'PARTIAL_OR_RESTRICTED',
    endpoints,
    message: isOverallOperational
      ? 'Elsevier Scopus Search and Serial Title APIs are active and operational.'
      : 'One or more Elsevier endpoints reported restricted entitlement or error.'
  };
}

module.exports = {
  normalizeIssn,
  normalizeDoi,
  calculateQuartileFromPercentile,
  resolveBestQuartile,
  lookupScopusCitations,
  lookupPublicationAnnualCitations,
  retrievePublicationCitations,
  searchJournalCandidates,
  retrieveJournalMetrics,
  lookupJournalCiteScore,
  enrichPublicationQuartile,
  refreshDueCitations,
  refreshDueJournalMetrics,
  getScopusDiagnosticStatus
};
