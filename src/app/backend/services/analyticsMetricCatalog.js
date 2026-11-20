'use strict';

/**
 * Institutional Analytics Metric Catalog
 * CHRIST (Deemed to be University) — IQAC Platform
 *
 * Centralized registry of all supported institutional metrics, their calculation logic,
 * dimensionality, data integration status, and privacy constraints.
 */

const METRIC_DOMAINS = [
  { id: 'overview', name: 'Executive Overview', icon: 'LayoutGrid', color: '#2855B9' },
  { id: 'students', name: 'Student Analytics', icon: 'GraduationCap', color: '#3168D9' },
  { id: 'academics', name: 'Academic Performance', icon: 'BookOpen', color: '#4F46E5' },
  { id: 'faculty', name: 'Teaching Faculty', icon: 'Users', color: '#0D9488' },
  { id: 'staff', name: 'Non-Teaching Staff', icon: 'Building2', color: '#64748B' },
  { id: 'research', name: 'Research & Innovation', icon: 'Sparkles', color: '#8055CB' },
  { id: 'placements', name: 'Placements & Internships', icon: 'Briefcase', color: '#E58A24' },
  { id: 'diversity', name: 'Diversity & Inclusion', icon: 'Compass', color: '#9B59B6' },
  { id: 'achievements', name: 'Achievements & Outreach', icon: 'Award', color: '#EC4899' },
  { id: 'governance', name: 'Data Quality & Governance', icon: 'CheckCircle2', color: '#10B981' }
];

const METRIC_CATALOG = [
  // ── Students Domain ──────────────────────────────────────────────────────────
  {
    id: 'students_enrolled',
    name: 'Total Enrolled Students',
    domain: 'students',
    category: 'Cohort Strength',
    unit: 'students',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Total verified students enrolled across all active degree programs based on distinct Register Numbers.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear', 'programLevel', 'batch', 'gender'],
    supportedCharts: ['bar', 'stacked_bar', 'line', 'area', 'donut', 'ranking', 'kpi', 'table']
  },
  {
    id: 'students_gender_ratio',
    name: 'Student Gender Distribution',
    domain: 'students',
    category: 'Demographics',
    unit: 'ratio',
    format: 'ratio',
    aggregation: 'count',
    status: 'available',
    description: 'Male vs Female breakdown of active enrolled students.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear', 'programLevel'],
    supportedCharts: ['donut', 'stacked_bar', 'bar', 'table']
  },
  {
    id: 'students_level_distribution',
    name: 'Enrolment by Academic Level',
    domain: 'students',
    category: 'Program Structure',
    unit: 'students',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Distribution of students across Undergraduate (UG), Postgraduate (PG), and Doctoral (PhD) levels.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'stacked_bar', 'donut', 'ranking', 'table']
  },
  {
    id: 'students_geographic_state',
    name: 'Student Domicile (State-wise)',
    domain: 'students',
    category: 'Geographic Diversity',
    unit: 'students',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Distribution of enrolled students by permanent home state within India (groups < 5 masked for privacy).',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'ranking', 'table', 'heatmap']
  },
  {
    id: 'students_geographic_country',
    name: 'International Students (Country-wise)',
    domain: 'students',
    category: 'Geographic Diversity',
    unit: 'students',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Number of international students categorized by permanent country of origin.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'ranking', 'donut', 'table']
  },

  // ── Academic Performance Domain ──────────────────────────────────────────────
  {
    id: 'academic_exam_pass_rate',
    name: 'Examination Pass Percentage',
    domain: 'academics',
    category: 'Academic Outcomes',
    unit: '%',
    format: 'percentage',
    aggregation: 'avg',
    status: 'awaiting_integration',
    availabilityNotice: 'Awaiting academic examination & evaluation records integration. No placeholder or simulated marks are presented.',
    description: 'Percentage of students successfully clearing semester examinations on first attempt.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear', 'programLevel'],
    supportedCharts: ['bar', 'line', 'kpi', 'table']
  },
  {
    id: 'academic_gpa_distribution',
    name: 'Cumulative GPA Tier Distribution',
    domain: 'academics',
    category: 'Academic Outcomes',
    unit: 'students',
    format: 'number',
    aggregation: 'count',
    status: 'awaiting_integration',
    availabilityNotice: 'Awaiting academic/examination record integration. Continuous internal assessment & CGPA records pending schema hook.',
    description: 'Distribution of graduating students across distinction, first class, and second class CGPA brackets.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear', 'programLevel'],
    supportedCharts: ['donut', 'bar', 'stacked_bar', 'table']
  },

  // ── Teaching Faculty Domain ──────────────────────────────────────────────────
  {
    id: 'faculty_count',
    name: 'Full-Time Teaching Faculty',
    domain: 'faculty',
    category: 'Faculty Strength',
    unit: 'faculty',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Total verified full-time faculty members assigned to academic departments.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear', 'designation', 'gender'],
    supportedCharts: ['bar', 'stacked_bar', 'line', 'ranking', 'kpi', 'table']
  },
  {
    id: 'faculty_cadre_distribution',
    name: 'Faculty Cadre & Designation Breakdown',
    domain: 'faculty',
    category: 'Cadre Structure',
    unit: 'faculty',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Breakdown of faculty across Professors, Associate Professors, Assistant Professors, and academic leadership.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['donut', 'bar', 'stacked_bar', 'table']
  },
  {
    id: 'faculty_phd_pct',
    name: 'PhD Qualification Rate',
    domain: 'faculty',
    category: 'Qualifications',
    unit: '%',
    format: 'percentage',
    aggregation: 'ratio',
    status: 'available',
    description: 'Percentage of full-time faculty holding doctoral degrees (PhD) as their highest terminal qualification.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'line', 'ranking', 'kpi', 'table']
  },
  {
    id: 'faculty_sfr',
    name: 'Student-to-Faculty Ratio (SFR)',
    domain: 'faculty',
    category: 'Institutional Capacity',
    unit: ':1',
    format: 'ratio',
    aggregation: 'ratio',
    status: 'available',
    description: 'Ratio of enrolled students to full-time teaching faculty. Statutory regulatory benchmark is 15:1 to 20:1.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'line', 'ranking', 'kpi', 'table']
  },
  {
    id: 'faculty_avg_experience',
    name: 'Average Teaching Experience',
    domain: 'faculty',
    category: 'Experience & Seniority',
    unit: 'years',
    format: 'number',
    aggregation: 'avg',
    status: 'available',
    description: 'Average years of teaching and professional experience among active faculty members.',
    supportedDimensions: ['campus', 'school', 'department'],
    supportedCharts: ['bar', 'ranking', 'kpi', 'table']
  },
  {
    id: 'faculty_gender_ratio',
    name: 'Faculty Gender Distribution',
    domain: 'faculty',
    category: 'Demographics',
    unit: 'ratio',
    format: 'ratio',
    aggregation: 'count',
    status: 'available',
    description: 'Male vs Female breakdown of teaching faculty.',
    supportedDimensions: ['campus', 'school', 'department'],
    supportedCharts: ['donut', 'stacked_bar', 'bar', 'table']
  },

  // ── Non-Teaching Staff Domain ────────────────────────────────────────────────
  {
    id: 'staff_headcount',
    name: 'Non-Teaching Staff Strength',
    domain: 'staff',
    category: 'Administrative Staff',
    unit: 'staff',
    format: 'number',
    aggregation: 'count',
    status: 'awaiting_integration',
    availabilityNotice: 'Awaiting HR/Staff dataset integration. Staff establishment rosters and non-teaching personnel records pending synchronization.',
    description: 'Total non-teaching, administrative, laboratory, and technical support personnel.',
    supportedDimensions: ['campus', 'department'],
    supportedCharts: ['bar', 'donut', 'kpi', 'table']
  },

  // ── Research & Innovation Domain ─────────────────────────────────────────────
  {
    id: 'research_publications',
    name: 'Scholarly Publications (Scopus / WoS)',
    domain: 'research',
    category: 'Publications',
    unit: 'papers',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Peer-reviewed research articles, book chapters, and conference papers indexed in Scopus and Web of Science.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear', 'indexing'],
    supportedCharts: ['bar', 'stacked_bar', 'line', 'area', 'ranking', 'kpi', 'table']
  },
  {
    id: 'research_quartiles',
    name: 'Journal Quartile Distribution (Q1 - Q4)',
    domain: 'research',
    category: 'Quality & Impact',
    unit: 'papers',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Distribution of journal publications across Scopus CiteScore quartiles (Q1, Q2, Q3, Q4) with multi-department attribution.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['donut', 'stacked_bar', 'bar', 'ranking', 'table']
  },
  {
    id: 'research_citations',
    name: 'Approved Citations',
    domain: 'research',
    category: 'Impact',
    unit: 'citations',
    format: 'number',
    aggregation: 'sum',
    status: 'available',
    description: 'Total verified citations accrued by published works in Scopus and Web of Science databases.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'line', 'area', 'ranking', 'kpi', 'table']
  },
  {
    id: 'research_grants_crores',
    name: 'Extramural Research Grants Sanctioned',
    domain: 'research',
    category: 'Sponsored Research',
    unit: '₹ Cr',
    format: 'currency_inr',
    aggregation: 'sum',
    status: 'available',
    description: 'Total sanctioned value of sponsored extramural research projects received from government and industry agencies.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'line', 'area', 'ranking', 'kpi', 'table']
  },
  {
    id: 'research_consultancy_lakhs',
    name: 'Consultancy Revenue Inflow',
    domain: 'research',
    category: 'Industry Engagement',
    unit: '₹ Lakhs',
    format: 'currency_inr',
    aggregation: 'sum',
    status: 'available',
    description: 'Total net revenue generated through corporate consulting and testing services.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'line', 'area', 'ranking', 'kpi', 'table']
  },
  {
    id: 'research_patents',
    name: 'Patents Filed & Granted',
    domain: 'research',
    category: 'Intellectual Property',
    unit: 'patents',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Total patents registered, published, and granted by Indian and international patent offices.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'stacked_bar', 'donut', 'ranking', 'kpi', 'table']
  },
  {
    id: 'research_copyrights',
    name: 'Copyrights Registered',
    domain: 'research',
    category: 'Intellectual Property',
    unit: 'copyrights',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Registered literary, artistic, and software copyrights.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'donut', 'ranking', 'kpi', 'table']
  },

  // ── Placements & Internships Domain ──────────────────────────────────────────
  {
    id: 'placements_placed_students',
    name: 'Distinct Placed Students',
    domain: 'placements',
    category: 'Recruitment',
    unit: 'students',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Unique graduating students securing one or more corporate placement offers (deduplicated by Register Number).',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear', 'batch'],
    supportedCharts: ['bar', 'stacked_bar', 'line', 'ranking', 'kpi', 'table']
  },
  {
    id: 'placements_total_offers',
    name: 'Total Job Offers',
    domain: 'placements',
    category: 'Recruitment',
    unit: 'offers',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Gross placement offers extended by recruiters, including multiple offers received by individual students.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear', 'batch'],
    supportedCharts: ['bar', 'line', 'ranking', 'kpi', 'table']
  },
  {
    id: 'placements_rate',
    name: 'Placement Success Rate',
    domain: 'placements',
    category: 'Recruitment',
    unit: '%',
    format: 'percentage',
    aggregation: 'ratio',
    status: 'available',
    description: 'Percentage of eligible graduating cohort placed in corporate or institutional roles.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear', 'batch'],
    supportedCharts: ['bar', 'line', 'ranking', 'kpi', 'table']
  },
  {
    id: 'placements_avg_ctc',
    name: 'Average Salary Package (CTC)',
    domain: 'placements',
    category: 'Compensation',
    unit: '₹ LPA',
    format: 'currency_inr',
    aggregation: 'avg',
    status: 'available',
    description: 'Mean annual cost to company (CTC) in Lakhs Per Annum across verified full-time placement offers.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear', 'batch'],
    supportedCharts: ['bar', 'line', 'ranking', 'kpi', 'table']
  },
  {
    id: 'placements_highest_ctc',
    name: 'Highest Salary Package',
    domain: 'placements',
    category: 'Compensation',
    unit: '₹ LPA',
    format: 'currency_inr',
    aggregation: 'max',
    status: 'available',
    description: 'Peak annual compensation package secured by a student in the reporting cohort.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear', 'batch'],
    supportedCharts: ['bar', 'ranking', 'kpi', 'table']
  },
  {
    id: 'internships_count',
    name: 'Student Internships',
    domain: 'placements',
    category: 'Experiential Learning',
    unit: 'internships',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Industry and research internships completed by enrolled students (distinct from full-time placements).',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'ranking', 'kpi', 'table']
  },

  // ── Diversity & Inclusion Domain ─────────────────────────────────────────────
  {
    id: 'diversity_gender_parity',
    name: 'Gender Parity Index (Female / Male)',
    domain: 'diversity',
    category: 'Gender Inclusivity',
    unit: 'ratio',
    format: 'ratio',
    aggregation: 'ratio',
    status: 'available',
    description: 'Female-to-male ratio across students and faculty populations. Values near 1.0 indicate demographic balance.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'line', 'kpi', 'table']
  },
  {
    id: 'diversity_regional_spread',
    name: 'National Representation (States)',
    domain: 'diversity',
    category: 'Geographic Inclusion',
    unit: 'states',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Number of Indian States and Union Territories represented across enrolled students and faculty (small groups < 5 suppressed).',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'ranking', 'kpi', 'table']
  },
  {
    id: 'diversity_international_reach',
    name: 'Global Representation (Countries)',
    domain: 'diversity',
    category: 'Internationalization',
    unit: 'countries',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Total distinct sovereign countries represented in student and faculty bodies.',
    supportedDimensions: ['campus', 'academicYear'],
    supportedCharts: ['bar', 'ranking', 'kpi', 'table']
  },

  // ── Achievements & Outreach Domain ───────────────────────────────────────────
  {
    id: 'achievements_awards',
    name: 'Faculty & Student Awards',
    domain: 'achievements',
    category: 'Recognitions',
    unit: 'awards',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'State, national, and international awards conferred by governmental bodies and learned societies.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'stacked_bar', 'ranking', 'kpi', 'table']
  },
  {
    id: 'achievements_invited_talks',
    name: 'Keynotes & Invited Lectures',
    domain: 'achievements',
    category: 'Academic Outreach',
    unit: 'talks',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Invited expert lectures, keynotes, and session chairing delivered at external conferences and summits.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'line', 'ranking', 'kpi', 'table']
  },
  {
    id: 'achievements_econtent',
    name: 'E-Contents & MOOCs Developed',
    domain: 'achievements',
    category: 'Digital Pedagogy',
    unit: 'modules',
    format: 'number',
    aggregation: 'count',
    status: 'available',
    description: 'Digital instructional content, SWAYAM/NPTEL modules, and educational videos created by faculty.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'donut', 'ranking', 'kpi', 'table']
  },

  // ── Data Quality & Governance Domain ─────────────────────────────────────────
  {
    id: 'governance_profile_completeness',
    name: 'Faculty Profile Completeness',
    domain: 'governance',
    category: 'Profile Governance',
    unit: '%',
    format: 'percentage',
    aggregation: 'avg',
    status: 'available',
    description: 'Average completion rate of mandatory profile attributes across active faculty profiles.',
    supportedDimensions: ['campus', 'school', 'department'],
    supportedCharts: ['bar', 'ranking', 'kpi', 'table']
  },
  {
    id: 'governance_verified_records',
    name: 'Verification Rate (Approved / Total)',
    domain: 'governance',
    category: 'Data Integrity',
    unit: '%',
    format: 'percentage',
    aggregation: 'ratio',
    status: 'available',
    description: 'Proportion of submitted research and activity records formally reviewed and approved by department reviewers.',
    supportedDimensions: ['campus', 'school', 'department', 'academicYear'],
    supportedCharts: ['bar', 'line', 'ranking', 'kpi', 'table']
  }
];

module.exports = {
  METRIC_DOMAINS,
  METRIC_CATALOG
};
