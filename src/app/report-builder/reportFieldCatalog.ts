// Field Catalog and Section Customization Metadata
// Master Specification V2.1 for CHRIST IQAC Institutional Report Builder

export interface FieldItem {
  id: string;
  label: string;
  description?: string;
  type: 'kpi' | 'chart' | 'table' | 'column' | 'record' | 'narrative';
  category: 'kpis' | 'charts' | 'tables' | 'records' | 'narrative';
  defaultSelected: boolean;
  notAllowedInSummary?: boolean;
  requiresDetailed?: boolean;
}

export interface SubModuleDefinition {
  id: string;
  name: string;
  description: string;
  iconName?: string;
  items: FieldItem[];
}

export interface SectionDefinition {
  id: string;
  number: number;
  name: string;
  description: string;
  subModules?: SubModuleDefinition[];
  items: FieldItem[];
  defaultSelected: boolean;
  strictExclusionNote?: string;
}

export const REPORT_FIELD_CATALOG: SectionDefinition[] = [
  // 1. EXECUTIVE OVERVIEW
  {
    id: 'executiveOverview',
    number: 1,
    name: 'Executive Overview',
    description: 'High-level synthesis of institutional performance, executive scorecard, verified achievements, and strategic observations.',
    defaultSelected: true,
    items: [
      // Category A: KPIs
      { id: 'kpi_total_faculty', label: 'Total Faculty Strength', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_phd_faculty', label: 'Ph.D. Qualified Faculty & Percentage', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_total_publications', label: 'Total Deduplicated Publications', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_q1_publications', label: 'Scopus Q1 Articles (High-Impact)', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_total_citations', label: 'Total Citations & Velocity', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_patents_ipr', label: 'Patents Granted & Published', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_external_grants', label: 'External Research Grants & Consultancy', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_placement_rate', label: 'Campus Placement Attainment %', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_highest_package', label: 'Highest Salary Package (LPA)', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_naac_nirf', label: 'NAAC Grade A++ & NIRF Rank', category: 'kpis', type: 'kpi', defaultSelected: true },
      // Category B: Charts
      { id: 'chart_research_by_dept', label: 'Research Output by Department', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
      { id: 'chart_output_categories', label: 'Scholarly Output Distribution', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
      // Category C: Summary Tables
      { id: 'tbl_executive_scorecard', label: 'Executive Scorecard Summary Table', category: 'tables', type: 'table', defaultSelected: true },
      // Category E: Narrative
      { id: 'narrative_verified_highlights', label: 'Institutional Strengths & Highlights', category: 'narrative', type: 'narrative', defaultSelected: true },
      { id: 'narrative_priority_observations', label: 'High-Priority Executive Observations', category: 'narrative', type: 'narrative', defaultSelected: true }
    ]
  },

  // 2. ACADEMIC & FACULTY PROFILE
  {
    id: 'academicFaculty',
    number: 2,
    name: 'Academic & Faculty Profile',
    description: 'Faculty cadre deployment, doctoral qualifications, experience distribution, and departmental faculty strength.',
    strictExclusionNote: 'Student Academic Performance is strictly excluded.',
    defaultSelected: true,
    items: [
      // Category A: KPIs
      { id: 'kpi_verified_faculty', label: 'Total Verified Faculty', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_phd_holders', label: 'Doctoral (Ph.D.) Degree Holders', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_phd_rate', label: 'Ph.D. Qualification Rate (%)', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'kpi_academic_depts', label: 'Academic Departments Count', category: 'kpis', type: 'kpi', defaultSelected: true },
      // Category B: Charts
      { id: 'chart_cadre_distribution', label: 'Faculty Cadre & Qualification Breakdown', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
      // Category C: Summary Tables
      { id: 'tbl_faculty_department', label: 'Departmental Faculty Cadre & Ph.D. Table', category: 'tables', type: 'table', defaultSelected: true },
      // Category D: Individual Records (Columns)
      { id: 'col_faculty_empid', label: 'Employee ID', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'col_faculty_name', label: 'Faculty Name', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'col_faculty_dept', label: 'Department', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'col_faculty_designation', label: 'Designation', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'col_faculty_qual', label: 'Highest Qualification', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'col_faculty_cu_exp', label: 'CHRIST Experience', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      // Category E: Narrative
      { id: 'narrative_faculty_compliance', label: 'Statutory Compliance & Retention Notes', category: 'narrative', type: 'narrative', defaultSelected: true }
    ]
  },

  // 3. RESEARCH & INNOVATION (Nested 9 Sub-Modules)
  {
    id: 'researchInnovation',
    number: 3,
    name: 'Research & Innovation',
    description: 'Comprehensive research analytics across publications, quartile metrics, citations, IPR patents, copyrights, consultancy, and sponsored grants.',
    defaultSelected: true,
    items: [],
    subModules: [
      {
        id: 'publications',
        name: 'Publications & Scholarly Output',
        description: 'Deduplicated scholarly articles, conference proceedings, and document indexing profile.',
        items: [
          { id: 'pub_kpi_total', label: 'Total Deduplicated Papers', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'pub_kpi_journals', label: 'Journal Articles & Reviews', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'pub_kpi_proceedings', label: 'Conference Proceedings', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'pub_kpi_scopus_indexed', label: 'Scopus Indexed Papers & 100% Rate', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'pub_chart_category', label: 'Publication Category Profile (Donut)', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
          { id: 'pub_chart_dept', label: 'Departmental Publications (Bar)', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
          { id: 'pub_tbl_dept', label: 'Departmental Publication Table', category: 'tables', type: 'table', defaultSelected: true },
          { id: 'pub_col_title', label: 'Publication Title', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
          { id: 'pub_col_authors', label: 'Authors', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
          { id: 'pub_col_journal', label: 'Journal / Source Name', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
          { id: 'pub_col_doi', label: 'DOI / Link', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
          { id: 'pub_col_year', label: 'Publication Year', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true }
        ]
      },
      {
        id: 'quartiles',
        name: 'Quartile Analytics (Q1–Q4)',
        description: 'Elsevier Scopus SCImago Journal Rank (SJR) quartile distribution and departmental benchmarks.',
        items: [
          { id: 'q_kpi_q1', label: 'Scopus Q1 (Top 25%) Count & Share', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'q_kpi_q2', label: 'Scopus Q2 (25%-50%) Count & Share', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'q_kpi_q3', label: 'Scopus Q3 (50%-75%) Count & Share', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'q_kpi_q4', label: 'Scopus Q4 (75%-100%) Count & Share', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'q_kpi_coverage', label: 'Quartile Coverage Rate (%)', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'q_kpi_unclassified', label: 'Unclassified Outputs (Conferences / Books)', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'q_chart_donut', label: 'Quartile Distribution (Donut)', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
          { id: 'q_chart_dept_mix', label: 'Departmental Quartile Mix (Stacked Bar)', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
          { id: 'q_tbl_dept', label: 'Department Quartile Benchmark Table', category: 'tables', type: 'table', defaultSelected: true }
        ]
      },
      {
        id: 'citations',
        name: 'Scopus Citations & Research Impact',
        description: 'Scopus citation velocity, institutional research density, and high-impact publications.',
        items: [
          { id: 'cite_kpi_total', label: 'Total Scopus Citations', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'cite_kpi_avg', label: 'Average Citations Per Paper', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'cite_kpi_papers_cited', label: 'Papers with Citations Count', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'cite_kpi_highly_cited', label: 'Highly Cited Papers (>=20 Citations)', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'cite_tbl_top_papers', label: 'Top 10 Highly Cited Papers Table', category: 'tables', type: 'table', defaultSelected: true }
        ]
      },
      {
        id: 'facultyContributions',
        name: 'Faculty Research Contribution',
        description: 'Individual scholarly productivity, top publishing researchers, and citation impact leaders.',
        items: [
          { id: 'fc_chart_top_pubs', label: 'Top Faculty by Publications (Bar)', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
          { id: 'fc_chart_top_cites', label: 'Top Faculty by Citations (Bar)', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
          { id: 'fc_tbl_top_faculty', label: 'Scholarly Productivity Attribution Table', category: 'tables', type: 'table', defaultSelected: true }
        ]
      },
      {
        id: 'patents',
        name: 'Patents & Intellectual Property',
        description: 'Intellectual Property Rights, granted patents, published applications, and commercialization.',
        items: [
          { id: 'pat_kpi_granted', label: 'Patents Granted by Regulatory Authorities', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'pat_kpi_published', label: 'Patents Published (Awaiting Examination)', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'pat_kpi_total_apps', label: 'Total Patent Applications', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'pat_tbl_dept_ipr', label: 'Departmental Patent Portfolio Table', category: 'tables', type: 'table', defaultSelected: true },
          { id: 'pat_col_title', label: 'Patent Title', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
          { id: 'pat_col_app_no', label: 'Application Number', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
          { id: 'pat_col_status', label: 'Status (Granted / Published)', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
          { id: 'pat_col_inventors', label: 'Inventors', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true }
        ]
      },
      {
        id: 'copyrights',
        name: 'Registered Copyrights',
        description: 'Software, artistic, and literary copyright registrations.',
        items: [
          { id: 'cr_kpi_registered', label: 'Total Registered Copyrights', category: 'kpis', type: 'kpi', defaultSelected: true }
        ]
      },
      {
        id: 'consultancy',
        name: 'Industry Consultancy',
        description: 'Corporate partnerships, technical advisory projects, and recognized consultancy revenue.',
        items: [
          { id: 'con_kpi_projects', label: 'Total Industry Consultancy Projects', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'con_kpi_revenue', label: 'Recognized Consultancy Revenue (₹ Lakhs)', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'con_tbl_dept', label: 'Departmental Consultancy Summary Table', category: 'tables', type: 'table', defaultSelected: true }
        ]
      },
      {
        id: 'sponsoredResearch',
        name: 'Sponsored Research Grants',
        description: 'Government and corporate extramural sponsored research grants.',
        items: [
          { id: 'sp_kpi_projects', label: 'Total Sponsored Research Projects', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'sp_kpi_funding', label: 'Sanctioned Extramural Funding (₹ Lakhs)', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'sp_tbl_dept', label: 'Departmental Sponsored Research Table', category: 'tables', type: 'table', defaultSelected: true }
        ]
      },
      {
        id: 'researchAwardsEContent',
        name: 'Research Awards & E-Contents',
        description: 'Faculty research recognitions, pedagogical awards, and developed e-content modules.',
        items: [
          { id: 'aw_kpi_awards', label: 'Research & Innovation Awards Count', category: 'kpis', type: 'kpi', defaultSelected: true },
          { id: 'aw_kpi_econtent', label: 'Digital E-Contents Modules Developed', category: 'kpis', type: 'kpi', defaultSelected: true }
        ]
      }
    ]
  },

  // 4. PLACEMENTS & CAREER DEVELOPMENT
  {
    id: 'placements',
    number: 4,
    name: 'Placements & Career Development',
    description: 'Graduating student recruitment outcomes, normalized salary compensation, and corporate recruiters.',
    defaultSelected: true,
    items: [
      // Category A: KPIs
      { id: 'place_kpi_eligible', label: 'Eligible Registered Students', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'place_kpi_placed', label: 'Unique Students Placed', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'place_kpi_rate', label: 'Placement Attainment Rate (%)', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'place_kpi_highest', label: 'Highest Salary Package (LPA)', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'place_kpi_average', label: 'Average Salary Package (LPA)', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'place_kpi_median', label: 'Median Salary Package (LPA)', category: 'kpis', type: 'kpi', defaultSelected: true },
      // Category B: Charts
      { id: 'place_chart_compensation', label: 'Compensation Distribution Brackets', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
      // Category C: Summary Tables
      { id: 'place_tbl_recruiters', label: 'Top Corporate Recruiters Summary Table', category: 'tables', type: 'table', defaultSelected: true },
      // Category D: Individual Records (Permitted ONLY in Detailed Report)
      { id: 'place_col_student_name', label: 'Student Name', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'place_col_register_no', label: 'Register Number', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'place_col_department', label: 'Department', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'place_col_program', label: 'Program / Course', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'place_col_company', label: 'Company / Recruiter', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'place_col_role', label: 'Designation / Role', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'place_col_package', label: 'Salary Package (LPA)', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'place_col_type', label: 'Employment Type (Full Time / Internship)', category: 'records', type: 'column', defaultSelected: true, requiresDetailed: true },
      { id: 'place_col_date', label: 'Offer Date', category: 'records', type: 'column', defaultSelected: false, requiresDetailed: true },
      // Category E: Narrative
      { id: 'place_narrative_stipend_policy', label: 'Stipend vs Full-Time CTC Normalization Policy Note', category: 'narrative', type: 'narrative', defaultSelected: true }
    ]
  },

  // 5. ACCREDITATION & QUALITY ASSURANCE
  {
    id: 'accreditation',
    number: 5,
    name: 'Accreditation & Quality Assurance',
    description: 'NAAC Cycle 4 assessment criteria, NIRF parameter analysis, and strategic plan attainment.',
    defaultSelected: true,
    items: [
      // Category A: KPIs
      { id: 'acc_kpi_naac_grade', label: 'NAAC Accreditation Status (A++, CGPA 3.74)', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'acc_kpi_nirf_rank', label: 'NIRF Overall Ranking (Ministry of Education)', category: 'kpis', type: 'kpi', defaultSelected: true },
      { id: 'acc_kpi_strategic_plan', label: 'Strategic Plan Milestone Attainment', category: 'kpis', type: 'kpi', defaultSelected: true },
      // Category B: Charts
      { id: 'acc_chart_naac_criteria', label: 'NAAC Cycle 4 Criteria Scores (Max 4.0)', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
      { id: 'acc_chart_nirf_params', label: 'NIRF Dimensional Parameters (Max 100)', category: 'charts', type: 'chart', defaultSelected: true, notAllowedInSummary: true },
      // Category C: Summary Tables
      { id: 'acc_tbl_quality_compliance', label: 'Quality Criterion Benchmark & Compliance Table', category: 'tables', type: 'table', defaultSelected: true }
    ]
  },

  // 6. COMPARATIVE ANALYTICS
  {
    id: 'comparativeAnalytics',
    number: 6,
    name: 'Comparative Analytics',
    description: 'Longitudinal multi-year progression across reporting periods and departmental cross-benchmarks.',
    defaultSelected: true,
    items: [
      // Category C: Summary Tables
      { id: 'comp_tbl_multi_year', label: 'Multi-Year Institutional Trajectory Table', category: 'tables', type: 'table', defaultSelected: true },
      { id: 'comp_tbl_dept_benchmark', label: 'Comprehensive Departmental Benchmark Matrix', category: 'tables', type: 'table', defaultSelected: true }
    ]
  },

  // 7. INSIGHTS & IQAC ACTION PLAN
  {
    id: 'insightsActionPlan',
    number: 7,
    name: 'Insights & IQAC Action Plan',
    description: 'Evidence-based quality improvement recommendations, accountable departments, and target milestones.',
    defaultSelected: true,
    items: [
      // Category C: Tables & Matrix
      { id: 'action_tbl_matrix', label: 'Actionable Quality Roadmap Matrix', category: 'tables', type: 'table', defaultSelected: true },
      // Category E: Narrative
      { id: 'action_narrative_signoff', label: 'Institutional Quality Sign-Off & Approvals', category: 'narrative', type: 'narrative', defaultSelected: true }
    ]
  },

  // 8. APPENDIX & METHODOLOGY
  {
    id: 'appendix',
    number: 8,
    name: 'Appendix & Methodology',
    description: 'Calculation formulas, data audit standards, currency representations, and statutory disclosures.',
    defaultSelected: true,
    items: [
      // Category E: Narrative / Standards
      { id: 'app_narrative_scopus_sjr', label: 'Scopus SCImago Journal Rank (SJR) Quartile Methodology', category: 'narrative', type: 'narrative', defaultSelected: true },
      { id: 'app_narrative_deduplication', label: 'Deduplicated Institutional Research Attribution', category: 'narrative', type: 'narrative', defaultSelected: true },
      { id: 'app_narrative_financial_norm', label: 'Financial Normalization & Unit Standardization (Lakhs)', category: 'narrative', type: 'narrative', defaultSelected: true },
      { id: 'app_narrative_placement_formula', label: 'Placement Percentage & Salary CTC Normalization Formula', category: 'narrative', type: 'narrative', defaultSelected: true },
      { id: 'app_narrative_scopus_sync', label: 'Scopus API Synchronization & Data Certification Standards', category: 'narrative', type: 'narrative', defaultSelected: true }
    ]
  }
];

export interface PlacementRecordConfig {
  enabled: boolean;
  columns: string[];
  topN: number | 'all';
  sortBy: 'package' | 'company' | 'studentName' | 'department' | 'placementDate';
  sortOrder: 'asc' | 'desc';
  filters: {
    company?: string;
    department?: string;
    course?: string;
    placementType?: string;
    academicYear?: string;
  };
}

export interface GranularContentConfig {
  sections: Record<string, boolean>;
  fieldSelections: Record<string, boolean>;
  placementRecords: PlacementRecordConfig;
}

export function getDefaultGranularConfig(reportType: 'summary' | 'analytical' | 'detailed'): GranularContentConfig {
  const isSummary = reportType === 'summary';
  const isDetailed = reportType === 'detailed';

  const sections: Record<string, boolean> = {
    executiveOverview: true,
    academicFaculty: true,
    researchInnovation: true,
    placements: true,
    accreditation: true,
    comparativeAnalytics: !isSummary,
    insightsActionPlan: true,
    appendix: true
  };

  const fieldSelections: Record<string, boolean> = {};

  REPORT_FIELD_CATALOG.forEach(sec => {
    sec.items.forEach(item => {
      if (isSummary && item.notAllowedInSummary) {
        fieldSelections[item.id] = false;
      } else if (item.requiresDetailed && !isDetailed) {
        fieldSelections[item.id] = false;
      } else {
        fieldSelections[item.id] = item.defaultSelected;
      }
    });

    if (sec.subModules) {
      sec.subModules.forEach(sub => {
        sub.items.forEach(item => {
          if (isSummary && item.notAllowedInSummary) {
            fieldSelections[item.id] = false;
          } else if (item.requiresDetailed && !isDetailed) {
            fieldSelections[item.id] = false;
          } else {
            fieldSelections[item.id] = item.defaultSelected;
          }
        });
      });
    }
  });

  const placementRecords: PlacementRecordConfig = {
    enabled: isDetailed,
    columns: [
      'place_col_student_name',
      'place_col_register_no',
      'place_col_department',
      'place_col_company',
      'place_col_role',
      'place_col_package',
      'place_col_type'
    ],
    topN: 20,
    sortBy: 'package',
    sortOrder: 'desc',
    filters: {}
  };

  return {
    sections,
    fieldSelections,
    placementRecords
  };
}
