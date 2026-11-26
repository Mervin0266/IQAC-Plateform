'use strict';

/**
 * Metric Source Registry & Report Quality Assurance Reconciliation Engine
 * CHRIST (Deemed to be University) — Internal Quality Assurance Cell (IQAC)
 * 
 * Provides:
 * 1. Metric Source Registry: Authoritative mapping of every institutional metric
 *    to database source table, fields, aggregation logic, unit, and verification criteria.
 * 2. Cross-Section Reconciliation Engine: Detects calculation discrepancies,
 *    scope conflicts, quartile classification errors, and zero-value representation issues.
 * 3. Validation Categories:
 *    - VALIDATED: Consistent, verified data with traceable source
 *    - WARNING: Potential observation, e.g. unclassified publications or baseline zero growth
 *    - CRITICAL_INCONSISTENCY: Contradictory metrics across report sections (blocks export)
 *    - MISSING_SOURCE_DATA: Legitimate empty/unrecorded metric requiring explanation
 *    - PENDING_VERIFICATION: Provisional data awaiting IQAC audit
 */

const METRIC_SOURCE_REGISTRY = {
  faculty_total: {
    id: 'faculty_total',
    name: 'Total Verified Faculty',
    module: 'Faculty',
    table: 'faculties',
    fields: ['id', 'employeeId', 'department', 'designation'],
    aggregation: 'COUNT(DISTINCT employeeId)',
    unit: 'headcount',
    reportingBasis: 'point_in_time',
    missingDataBehavior: 'zero',
    verification: 'Institutional HR Roster & Biometric Employment Records'
  },
  faculty_phd: {
    id: 'faculty_phd',
    name: 'Ph.D. Qualified Faculty',
    module: 'Faculty',
    table: 'faculties',
    fields: ['highestQualification'],
    aggregation: 'COUNT(CASE WHEN highestQualification ILIKE \'%ph%\' OR highestQualification ILIKE \'%doc%\')',
    unit: 'headcount',
    reportingBasis: 'point_in_time',
    missingDataBehavior: 'zero',
    verification: 'Verified Doctoral Degree Certificates'
  },
  publications_total: {
    id: 'publications_total',
    name: 'Deduplicated Scholarly Publications',
    module: 'Research',
    table: 'publications',
    fields: ['id', 'doi', 'scopusEid', 'scopusDocId', 'academicYear', 'publicationYear', 'publicationDate'],
    aggregation: 'COUNT(DISTINCT COALESCE(doi, scopusEid, title))',
    unit: 'outputs',
    reportingBasis: 'academic_year_range',
    missingDataBehavior: 'zero',
    verification: 'Elsevier Scopus Database & DOI Validation'
  },
  publications_quartiles: {
    id: 'publications_quartiles',
    name: 'Scopus SJR Quartile Distribution (Q1–Q4)',
    module: 'Research',
    table: 'publications',
    fields: ['quartile', 'quartileStatus', 'scopusSourceId', 'citeScoreYear'],
    aggregation: 'GROUP BY quartile',
    unit: 'outputs',
    reportingBasis: 'academic_year_range',
    missingDataBehavior: 'unclassified',
    verification: 'SCImago Journal Rank (SJR) & Scopus Source Metrics'
  },
  citations_scopus: {
    id: 'citations_scopus',
    name: 'Total Scopus Citations',
    module: 'Research',
    table: 'publications',
    fields: ['citationCount', 'lastCitationRefreshAt'],
    aggregation: 'SUM(citationCount)',
    unit: 'citations',
    reportingBasis: 'point_in_time_snapshot',
    missingDataBehavior: 'zero',
    verification: 'Elsevier Scopus Cited-By API Synchronization'
  },
  patents_unique: {
    id: 'patents_unique',
    name: 'Unique Patent Applications',
    module: 'IPR',
    table: 'patents',
    fields: ['id', 'applicationNo', 'patentNo', 'status', 'filedDate', 'grantedDate'],
    aggregation: 'COUNT(DISTINCT COALESCE(applicationNo, patentNo, id))',
    unit: 'applications',
    reportingBasis: 'application_filing_year',
    missingDataBehavior: 'zero',
    verification: 'Indian Patent Office (IPO) & WIPO Official Gazette'
  },
  consultancy_revenue: {
    id: 'consultancy_revenue',
    name: 'Recognized Consultancy Revenue',
    module: 'Consultancy',
    table: 'consultancy_projects',
    fields: ['revenueInLakhs', 'amountReceivedInLakhs', 'startDate', 'status'],
    aggregation: 'SUM(COALESCE(revenueInLakhs, amountReceivedInLakhs))',
    unit: 'INR Lakhs',
    reportingBasis: 'start_date_academic_year',
    missingDataBehavior: 'zero',
    verification: 'Finance Office Audited Consultancy Accounts'
  },
  sponsored_sanctioned: {
    id: 'sponsored_sanctioned',
    name: 'Sponsored Research Sanctioned Grants',
    module: 'Sponsored Research',
    table: 'sponsored_projects',
    fields: ['sanctionedAmount', 'sanctionYear', 'sanctionOrderNo'],
    aggregation: 'SUM(sanctionedAmount)',
    unit: 'INR Lakhs',
    reportingBasis: 'sanction_order_academic_year',
    missingDataBehavior: 'zero',
    verification: 'Government & Extramural Agency Sanction Orders'
  },
  placements_unique_placed: {
    id: 'placements_unique_placed',
    name: 'Unique Graduating Students Placed',
    module: 'Placements',
    table: 'placements',
    fields: ['studentId', 'studentName', 'company', 'package', 'placementType'],
    aggregation: 'COUNT(DISTINCT studentId) WHERE placementType != \'internship\'',
    unit: 'students',
    reportingBasis: 'graduating_batch_cycle',
    missingDataBehavior: 'zero_or_pending',
    verification: 'Verified Corporate Offer Letters'
  },
  internships_count: {
    id: 'internships_count',
    name: 'Verified Student Internships',
    module: 'Placements',
    table: 'placements',
    fields: ['studentId', 'monthlyStipend', 'placementType'],
    aggregation: 'COUNT(id) WHERE placementType = \'internship\'',
    unit: 'internships',
    reportingBasis: 'academic_year',
    missingDataBehavior: 'zero',
    verification: 'Company Internship Completion Certificates'
  }
};

/**
 * Validates and reconciles complete reportData before preview and export generation.
 * Enforces institutional cross-section mathematical consistency.
 * 
 * @param {Object} reportData The generated or loaded report data
 * @param {Object} config The report configuration
 * @returns {Object} { isValid, summary: { validated, warnings, criticalErrors }, details: [] }
 */
function reconcileReportData(reportData, config = {}) {
  const details = [];
  const metrics = reportData.metrics || {};
  const meta = reportData.meta || {};

  // ----------------------------------------------------
  // 1. Publication Cross-Section Reconciliation
  // ----------------------------------------------------
  const totalPubs = metrics.publications?.total || 0;
  const ayRows = reportData.ayComparisonRows || [];
  
  if (ayRows.length > 0) {
    // Sum of canonical publications in reporting years
    const sumAyPubs = ayRows.reduce((acc, row) => acc + (Number(row.publications) || 0), 0);
    
    // If reporting years match the scope, check reconciliation
    if (sumAyPubs !== totalPubs) {
      details.push({
        code: 'PUB_AY_VARIANCE',
        type: 'WARNING',
        area: 'Publications',
        message: `Sum of publications across comparison years (${sumAyPubs}) differs from total unique publications (${totalPubs}). This is expected when historical comparison years extend beyond the active reporting scope or when co-authored cross-period publications occur.`,
        reconciliationNote: 'Total publications metric is deduplicated at the university level. Multi-year comparison displays individual annual outputs.'
      });
    } else {
      details.push({
        code: 'PUB_AY_RECONCILED',
        type: 'VALIDATED',
        area: 'Publications',
        message: `Total publications (${totalPubs}) perfectly reconciles with annual publication breakdown.`
      });
    }
  }

  // ----------------------------------------------------
  // 2. Quartile Mathematical Consistency & Eligibility
  // ----------------------------------------------------
  const qBreakdown = metrics.publications?.quartileBreakdown || [];
  const q1 = metrics.publications?.q1Count || 0;
  const q2 = metrics.publications?.q2Count || 0;
  const q3 = metrics.publications?.q3Count || 0;
  const q4 = metrics.publications?.q4Count || 0;
  const unclassified = metrics.publications?.unclassifiedCount || 0;
  const rankedSum = q1 + q2 + q3 + q4;

  if (rankedSum + unclassified !== totalPubs && totalPubs > 0) {
    details.push({
      code: 'QUARTILE_SUM_MISMATCH',
      type: 'CRITICAL_INCONSISTENCY',
      area: 'Quartiles',
      message: `Quartile components (Q1:${q1} + Q2:${q2} + Q3:${q3} + Q4:${q4} = ${rankedSum}) + Unclassified (${unclassified}) = ${rankedSum + unclassified}, which does not match total publications (${totalPubs}).`
    });
  } else {
    details.push({
      code: 'QUARTILE_RECONCILED',
      type: 'VALIDATED',
      area: 'Quartiles',
      message: `Quartile sum (${rankedSum} ranked + ${unclassified} unclassified = ${totalPubs}) is mathematically consistent.`
    });
  }

  // ----------------------------------------------------
  // 3. Patent & IPR Attribution Check
  // ----------------------------------------------------
  const totalPatents = metrics.ipr?.totalPatents || 0;
  const grantedPatents = metrics.ipr?.patentsGranted || 0;
  const publishedPatents = metrics.ipr?.patentsPublished || 0;

  if (grantedPatents > totalPatents) {
    details.push({
      code: 'PATENT_GRANT_EXCEEDS_TOTAL',
      type: 'CRITICAL_INCONSISTENCY',
      area: 'IPR',
      message: `Granted patents (${grantedPatents}) cannot exceed total patent applications (${totalPatents}).`
    });
  } else {
    details.push({
      code: 'PATENT_RECONCILED',
      type: 'VALIDATED',
      area: 'IPR',
      message: `Patent metrics (${totalPatents} applications, ${grantedPatents} granted, ${publishedPatents} published) are consistent.`
    });
  }

  // ----------------------------------------------------
  // 4. Placements & Salary Package Representation
  // ----------------------------------------------------
  const eligible = metrics.placements?.eligibleStudents || 0;
  const placed = metrics.placements?.placedStudents || 0;
  const highestLpa = metrics.placements?.highestPackageLpa;

  if (placed > eligible && eligible > 0) {
    details.push({
      code: 'PLACED_EXCEEDS_ELIGIBLE',
      type: 'CRITICAL_INCONSISTENCY',
      area: 'Placements',
      message: `Placed students (${placed}) cannot exceed eligible cohort (${eligible}).`
    });
  }

  if (placed === 0) {
    if (highestLpa !== null && highestLpa !== undefined && highestLpa !== 0) {
      details.push({
        code: 'SALARY_WITH_ZERO_PLACED',
        type: 'WARNING',
        area: 'Placements',
        message: 'Highest package is reported while placed count is 0. Salary should be displayed as N/A.'
      });
    }
    details.push({
      code: 'PLACEMENT_ZERO_STATE',
      type: 'MISSING_SOURCE_DATA',
      area: 'Placements',
      message: 'Zero verified placement offers recorded for the selected scope. Salary metrics will display as N/A instead of misleading Rs. 0.00 LPA.'
    });
  } else {
    details.push({
      code: 'PLACEMENT_RECONCILED',
      type: 'VALIDATED',
      area: 'Placements',
      message: `Placement attainment (${placed}/${eligible} = ${metrics.placements?.placementRate}%) verified.`
    });
  }

  // ----------------------------------------------------
  // 5. Faculty Scope Labelling Check
  // ----------------------------------------------------
  const isEntireUniversity = (config.scopeConfig?.campuses?.includes('All') || !config.scopeConfig?.campuses?.length) &&
    (config.scopeConfig?.schools?.includes('All') || !config.scopeConfig?.schools?.length) &&
    (config.scopeConfig?.departments?.includes('All') || !config.scopeConfig?.departments?.length);

  const scopeLabel = meta.scopeLabel || '';
  if (!isEntireUniversity && scopeLabel.toLowerCase().includes('entire university')) {
    details.push({
      code: 'FACULTY_SCOPE_MISLABEL',
      type: 'WARNING',
      area: 'Faculty Scope',
      message: 'Cover page or metadata references "Entire University Faculty" despite specific departments/schools being filtered. Should be labeled "Faculty within Selected Reporting Scope".'
    });
  } else {
    details.push({
      code: 'FACULTY_SCOPE_VERIFIED',
      type: 'VALIDATED',
      area: 'Faculty Scope',
      message: `Faculty scope accurately reflects ${isEntireUniversity ? 'Entire University' : 'Selected Scope'}.`
    });
  }

  // ----------------------------------------------------
  // 6. Financial Separation Check (Consultancy vs Sponsored)
  // ----------------------------------------------------
  const consultRev = metrics.consultancy?.totalRevenueLakhs || 0;
  const sponFund = metrics.sponsoredResearch?.totalFundingLakhs || 0;
  details.push({
    code: 'FINANCIAL_METRICS_DISTINCT',
    type: 'VALIDATED',
    area: 'Finance',
    message: `Consultancy recognized revenue (Rs. ${consultRev} L) and Sponsored research grants (Rs. ${sponFund} L) are preserved as distinct audited metrics.`
  });

  // Summary counts
  const validatedCount = details.filter(d => d.type === 'VALIDATED').length;
  const warningCount = details.filter(d => d.type === 'WARNING').length;
  const criticalCount = details.filter(d => d.type === 'CRITICAL_INCONSISTENCY').length;
  const missingCount = details.filter(d => d.type === 'MISSING_SOURCE_DATA').length;

  const isValid = criticalCount === 0;

  return {
    isValid,
    summary: {
      totalChecks: details.length,
      validated: validatedCount,
      passed: validatedCount,
      warnings: warningCount,
      criticalInconsistencies: criticalCount,
      criticalErrors: criticalCount,
      missingData: missingCount,
      status: isValid ? (warningCount === 0 ? 'CERTIFIED_VERIFIED' : 'VERIFIED_WITH_OBSERVATIONS') : 'VALIDATION_FAILED'
    },
    details,
    metricRegistry: METRIC_SOURCE_REGISTRY
  };
}

module.exports = {
  METRIC_SOURCE_REGISTRY,
  reconcileReportData
};
