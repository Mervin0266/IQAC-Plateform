'use strict';

const {
  Role,
  ModuleConfig,
  FormDefinition,
  FormField,
  SystemConfiguration
} = require('../models');

const ALL_PERMS = ['view', 'add', 'edit', 'delete', 'approve', 'export', 'import', 'manage'];

function buildPermSet(allowed = []) {
  const obj = {};
  ALL_PERMS.forEach(p => {
    obj[p] = allowed.includes(p);
  });
  return obj;
}

const MODULE_KEYS = [
  'dashboard',
  'faculty-details',
  'student-details',
  'department-details',
  'departmental-activities',
  'publications',
  'patents',
  'copyrights',
  'sponsored-research',
  'consultancy-projects',
  'placements-internships',
  'achievements',
  'naac-accreditation',
  'nba-tracking',
  'ranking',
  'centre-excellence',
  'strategic-plan',
  'system-admin'
];

function buildUniformRolePermissions(allowedPerms, excludeModules = []) {
  const matrix = {};
  MODULE_KEYS.forEach(mod => {
    if (excludeModules.includes(mod)) {
      matrix[mod] = buildPermSet([]);
    } else {
      matrix[mod] = buildPermSet(allowedPerms);
    }
  });
  return matrix;
}

const DEFAULT_ROLES = [
  {
    code: 'admin',
    name: 'System Administrator',
    description: 'Unrestricted System Administrator with exclusive access to System Administration V2.0, RBAC, Form Builder, Institutional Structure, Backups, and Audit Logs.',
    isSystem: true,
    isSystemAdmin: true,
    isActive: true,
    defaultScope: 'university',
    permissions: buildUniformRolePermissions(ALL_PERMS)
  },
  {
    code: 'iqac_admin',
    name: 'IQAC Administrator',
    description: 'Operational IQAC administrator with university-wide record approvals, reporting, and module management without System Administration privileges.',
    isSystem: true,
    isSystemAdmin: false,
    isActive: true,
    defaultScope: 'university',
    permissions: buildUniformRolePermissions(['view', 'add', 'edit', 'delete', 'approve', 'export', 'import'], ['system-admin'])
  },
  {
    code: 'authority',
    name: 'Institutional Authority',
    description: 'Vice Chancellor, Registrar, and Deans with university-wide read-only oversight, analytics, and executive reporting.',
    isSystem: true,
    isSystemAdmin: false,
    isActive: true,
    defaultScope: 'university',
    permissions: buildUniformRolePermissions(['view', 'export'], ['system-admin'])
  },
  {
    code: 'hod',
    name: 'Head of Department',
    description: 'Departmental head with verification, approval, edit, bulk import, and reporting privileges scoped to assigned department(s).',
    isSystem: true,
    isSystemAdmin: false,
    isActive: true,
    defaultScope: 'department',
    permissions: buildUniformRolePermissions(['view', 'add', 'edit', 'delete', 'approve', 'export', 'import'], ['system-admin'])
  },
  {
    code: 'coordinator',
    name: 'Department Coordinator',
    description: 'IQAC Coordinator with departmental submission management, criterion verification, bulk imports, and exports.',
    isSystem: true,
    isSystemAdmin: false,
    isActive: true,
    defaultScope: 'department',
    permissions: buildUniformRolePermissions(['view', 'add', 'edit', 'approve', 'export', 'import'], ['system-admin'])
  },
  {
    code: 'faculty',
    name: 'Faculty / Researcher',
    description: 'Faculty member managing personal academic profiles, research publications, patents, grants, and submissions.',
    isSystem: true,
    isSystemAdmin: false,
    isActive: true,
    defaultScope: 'own',
    permissions: buildUniformRolePermissions(['view', 'add', 'edit'], ['system-admin', 'strategic-plan'])
  }
];

const DEFAULT_MODULES = [
  {
    moduleKey: 'dashboard',
    moduleName: 'Institutional Intelligence Dashboard V2.0',
    description: 'Executive institutional KPIs, analytics charts, multi-year comparisons, and centralized reports.',
    routeKey: 'dashboard',
    tableNameRef: null,
    isEnabled: true,
    isCritical: true,
    dependencies: [],
    affectedRoutes: ['dashboard']
  },
  {
    moduleKey: 'system-admin',
    moduleName: 'System Administration V2.0',
    description: 'Centralized RBAC, users, form builder, institutional structure, system settings, and audit control.',
    routeKey: 'system-admin',
    tableNameRef: 'users',
    isEnabled: true,
    isCritical: true,
    dependencies: [],
    affectedRoutes: ['system-admin', 'user-management', 'user-roles']
  },
  {
    moduleKey: 'faculty-details',
    moduleName: 'Faculty Management',
    description: 'Faculty directory, employee identity, qualifications, cadre, experience, and bulk uploads.',
    routeKey: 'faculty-details',
    tableNameRef: 'faculties',
    isEnabled: true,
    isCritical: false,
    dependencies: [],
    affectedRoutes: ['faculty-details']
  },
  {
    moduleKey: 'student-details',
    moduleName: 'Student Details V3.0',
    description: 'Student cohorts, register numbers, program levels, demographics, and bulk enrolment uploads.',
    routeKey: 'student-details',
    tableNameRef: 'students',
    isEnabled: true,
    isCritical: false,
    dependencies: [],
    affectedRoutes: ['student-details']
  },
  {
    moduleKey: 'department-details',
    moduleName: 'Department Details',
    description: 'Department profiles, leadership metadata, faculty/student summaries, and activity trackers.',
    routeKey: 'department-details',
    tableNameRef: 'departments',
    isEnabled: true,
    isCritical: false,
    dependencies: ['faculty-details', 'student-details'],
    affectedRoutes: ['department-details']
  },
  {
    moduleKey: 'departmental-activities',
    moduleName: 'Departmental Activities',
    description: 'Workshops, seminars, FDPs, guest lectures, and co-curricular events.',
    routeKey: 'departmental-activities',
    tableNameRef: 'departmental_activities',
    isEnabled: true,
    isCritical: false,
    dependencies: ['department-details'],
    affectedRoutes: ['departmental-activities']
  },
  {
    moduleKey: 'publications',
    moduleName: 'Research Publications & Citations',
    description: 'Scopus/WoS/UGC-CARE papers, faculty associations, citation snapshots, and Research Reports.',
    routeKey: 'publications',
    tableNameRef: 'publications',
    isEnabled: true,
    isCritical: false,
    dependencies: ['faculty-details'],
    affectedRoutes: ['publications', 'research-metrics']
  },
  {
    moduleKey: 'patents',
    moduleName: 'IPRs — Patents',
    description: 'Filed, published, and granted patents with verified proof documents.',
    routeKey: 'research-innovation',
    tableNameRef: 'patents',
    isEnabled: true,
    isCritical: false,
    dependencies: [],
    affectedRoutes: ['research-innovation', 'patents']
  },
  {
    moduleKey: 'copyrights',
    moduleName: 'IPRs — Copyrights',
    description: 'Copyright applications, registrations, multi-faculty associations, and proof links.',
    routeKey: 'copyrights',
    tableNameRef: 'copyrights',
    isEnabled: true,
    isCritical: false,
    dependencies: ['faculty-details'],
    affectedRoutes: ['copyrights']
  },
  {
    moduleKey: 'sponsored-research',
    moduleName: 'Sponsored Research Projects',
    description: 'Extramural grants, sanction orders, funding agencies, installments, and agreements.',
    routeKey: 'sponsored-research',
    tableNameRef: 'sponsored_projects',
    isEnabled: true,
    isCritical: false,
    dependencies: [],
    affectedRoutes: ['sponsored-research']
  },
  {
    moduleKey: 'consultancy-projects',
    moduleName: 'Consultancy Projects',
    description: 'Industry consultancy engagements, revenue inflows, contracts, and completion proofs.',
    routeKey: 'consultancy-projects',
    tableNameRef: 'consultancy_projects',
    isEnabled: true,
    isCritical: false,
    dependencies: [],
    affectedRoutes: ['consultancy-projects']
  },
  {
    moduleKey: 'placements-internships',
    moduleName: 'Placements & Internships',
    description: 'Campus hiring, recruiters, CTC bands, internship stipends, and offer letters.',
    routeKey: 'placements-internships',
    tableNameRef: 'placements',
    isEnabled: true,
    isCritical: false,
    dependencies: ['student-details'],
    affectedRoutes: ['placements-internships']
  },
  {
    moduleKey: 'achievements',
    moduleName: 'Achievements & Awards',
    description: 'Faculty and student awards, recognitions, and institutional honors.',
    routeKey: 'achievements',
    tableNameRef: 'achievements',
    isEnabled: true,
    isCritical: false,
    dependencies: [],
    affectedRoutes: ['achievements']
  },
  {
    moduleKey: 'naac-accreditation',
    moduleName: 'NAAC Accreditation & SSR',
    description: 'NAAC 7-Criteria parameters, submissions, and evidence mapping.',
    routeKey: 'naac-accreditation',
    tableNameRef: 'accreditation_parameters',
    isEnabled: true,
    isCritical: false,
    dependencies: [],
    affectedRoutes: ['naac-accreditation', 'accreditation']
  },
  {
    moduleKey: 'nba-tracking',
    moduleName: 'NBA Tracking & SAR',
    description: 'Program-level NBA outcome compliance and criteria monitoring.',
    routeKey: 'nba-tracking',
    tableNameRef: 'accreditation_parameters',
    isEnabled: true,
    isCritical: false,
    dependencies: [],
    affectedRoutes: ['nba-tracking']
  },
  {
    moduleKey: 'ranking',
    moduleName: 'Institutional Rankings',
    description: 'NIRF, India Today MDRA, THE World, and QS India ranking benchmarks.',
    routeKey: 'ranking',
    tableNameRef: null,
    isEnabled: true,
    isCritical: false,
    dependencies: [],
    affectedRoutes: ['ranking', 'nirf-ranking', 'india-today-ranking', 'the-world-ranking', 'qs-india-ranking']
  },
  {
    moduleKey: 'centre-excellence',
    moduleName: 'Centre of Excellence',
    description: 'Specialized research laboratories and interdisciplinary excellence centers.',
    routeKey: 'centre-excellence',
    tableNameRef: null,
    isEnabled: true,
    isCritical: false,
    dependencies: [],
    affectedRoutes: ['centre-excellence']
  },
  {
    moduleKey: 'strategic-plan',
    moduleName: 'Strategic Plan 2025–30',
    description: 'Institutional milestones, departmental strategic goals, and attainment tracking.',
    routeKey: 'strategic-plan',
    tableNameRef: 'strategic_plans',
    isEnabled: true,
    isCritical: false,
    dependencies: [],
    affectedRoutes: ['strategic-plan']
  }
];

const DEFAULT_FORMS = [
  {
    moduleKey: 'student-details',
    formKey: 'student-details-form',
    formName: 'Student Details & Enrolment Form',
    description: 'Primary registration, academic cohort, program level, and demographic entry form.',
    tableNameRef: 'students',
    fields: [
      { fieldKey: 'registerNumber', label: 'Register Number', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 1 },
      { fieldKey: 'name', label: 'Student Full Name', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 2 },
      { fieldKey: 'email', label: 'Institutional Email', fieldType: 'email', isCore: true, isRequired: false, displayOrder: 3 },
      { fieldKey: 'phone', label: 'Mobile Number', fieldType: 'phone', isCore: true, isRequired: false, displayOrder: 4 },
      { fieldKey: 'department', label: 'Department', fieldType: 'department_selector', isCore: true, isRequired: true, displayOrder: 5 },
      { fieldKey: 'programLevel', label: 'Program Level', fieldType: 'dropdown', isCore: true, isRequired: false, options: ['Undergraduate', 'Postgraduate', 'PhD'], displayOrder: 6 },
      { fieldKey: 'course', label: 'Program / Course', fieldType: 'text', isCore: true, isRequired: false, displayOrder: 7 },
      { fieldKey: 'academicYear', label: 'Academic Year', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'], displayOrder: 8 },
      { fieldKey: 'gender', label: 'Gender', fieldType: 'radio', isCore: true, isRequired: false, options: ['Male', 'Female', 'Other'], displayOrder: 9 },
      { fieldKey: 'status', label: 'Enrolment Status', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['Active', 'Graduated', 'On Leave'], defaultValue: 'Active', displayOrder: 10 }
    ]
  },
  {
    moduleKey: 'faculty-details',
    formKey: 'faculty-profile-form',
    formName: 'Faculty Profile & Cadre Form',
    description: 'Employee identity, designation, qualification level, teaching experience, and status.',
    tableNameRef: 'faculties',
    fields: [
      { fieldKey: 'employeeId', label: 'Employee ID', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 1 },
      { fieldKey: 'name', label: 'Faculty Name', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 2 },
      { fieldKey: 'designation', label: 'Designation', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['Professor', 'Associate Professor', 'Assistant Professor', 'Professor of Practice', 'Adjunct Faculty'], displayOrder: 3 },
      { fieldKey: 'department', label: 'Department', fieldType: 'department_selector', isCore: true, isRequired: true, displayOrder: 4 },
      { fieldKey: 'academicYear', label: 'Academic Year', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'], displayOrder: 5 },
      { fieldKey: 'highestQualification', label: 'Highest Qualification', fieldType: 'text', isCore: true, isRequired: false, displayOrder: 6 },
      { fieldKey: 'dateOfJoining', label: 'Date of Joining', fieldType: 'date', isCore: true, isRequired: false, displayOrder: 7 },
      { fieldKey: 'cuExpYears', label: 'CU Experience (Years)', fieldType: 'number', isCore: true, isRequired: false, validationRules: { min: 0, max: 60 }, displayOrder: 8 },
      { fieldKey: 'prevTeachingExpYears', label: 'Prior Teaching Experience (Years)', fieldType: 'number', isCore: true, isRequired: false, validationRules: { min: 0, max: 60 }, displayOrder: 9 },
      { fieldKey: 'status', label: 'Employment Status', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['Active', 'On Sabbatical', 'Relieved'], defaultValue: 'Active', displayOrder: 10 }
    ]
  },
  {
    moduleKey: 'sponsored-research',
    formKey: 'sponsored-research-form',
    formName: 'Sponsored Research Grant Form',
    description: 'Extramural project grant submission, funding agency, sanction amount, and duration.',
    tableNameRef: 'sponsored_projects',
    fields: [
      { fieldKey: 'title', label: 'Project Title', fieldType: 'long_text', isCore: true, isRequired: true, displayOrder: 1 },
      { fieldKey: 'principalInvestigator', label: 'Principal Investigator', fieldType: 'faculty_selector', isCore: true, isRequired: true, displayOrder: 2 },
      { fieldKey: 'fundingAgency', label: 'Funding Agency', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 3 },
      { fieldKey: 'agencyType', label: 'Agency Category', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['Government (National)', 'Government (State)', 'International Agency', 'Industry / Corporate', 'University Seed Money / Internal'], displayOrder: 4 },
      { fieldKey: 'sanctionedAmount', label: 'Sanctioned Amount (INR)', fieldType: 'number', isCore: true, isRequired: true, validationRules: { min: 0 }, displayOrder: 5 },
      { fieldKey: 'academicYear', label: 'Academic Year', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'], displayOrder: 6 },
      { fieldKey: 'department', label: 'Department', fieldType: 'department_selector', isCore: true, isRequired: true, displayOrder: 7 },
      { fieldKey: 'status', label: 'Project Status', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['Ongoing', 'Completed', 'Sanctioned', 'Proposal Submitted', 'Terminated'], displayOrder: 8 }
    ]
  },
  {
    moduleKey: 'consultancy-projects',
    formKey: 'consultancy-project-form',
    formName: 'Consultancy Project Form',
    description: 'Corporate/external consultancy engagements, contract values, and revenue tracking.',
    tableNameRef: 'consultancy_projects',
    fields: [
      { fieldKey: 'projectName', label: 'Consultancy Project Title', fieldType: 'long_text', isCore: true, isRequired: true, displayOrder: 1 },
      { fieldKey: 'teacherConsultant', label: 'Lead Consultant', fieldType: 'faculty_selector', isCore: true, isRequired: true, displayOrder: 2 },
      { fieldKey: 'sponsoringAgency', label: 'Client / Sponsoring Agency', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 3 },
      { fieldKey: 'contractValueInLakhs', label: 'Contract Value (Lakhs INR)', fieldType: 'number', isCore: true, isRequired: true, validationRules: { min: 0 }, displayOrder: 4 },
      { fieldKey: 'year', label: 'Academic Year', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 5 },
      { fieldKey: 'department', label: 'Department', fieldType: 'department_selector', isCore: true, isRequired: true, displayOrder: 6 },
      { fieldKey: 'projectStatus', label: 'Project Status', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['Ongoing', 'Completed', 'Initiated'], displayOrder: 7 }
    ]
  },
  {
    moduleKey: 'patents',
    formKey: 'patent-ip-form',
    formName: 'Patents & Intellectual Property Form',
    description: 'Patent filings, publications, grants, and technology licensing.',
    tableNameRef: 'patents',
    fields: [
      { fieldKey: 'title', label: 'Patent Title', fieldType: 'long_text', isCore: true, isRequired: true, displayOrder: 1 },
      { fieldKey: 'inventors', label: 'Inventors', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 2 },
      { fieldKey: 'applicationNo', label: 'Application Number', fieldType: 'text', isCore: true, isRequired: false, displayOrder: 3 },
      { fieldKey: 'patentType', label: 'Jurisdiction / Type', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['Indian', 'International', 'PCT', 'Copyright', 'Design'], displayOrder: 4 },
      { fieldKey: 'status', label: 'Patent Status', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['Filed', 'Published', 'Granted', 'Licensed'], displayOrder: 5 },
      { fieldKey: 'department', label: 'Department', fieldType: 'department_selector', isCore: true, isRequired: true, displayOrder: 6 },
      { fieldKey: 'academicYear', label: 'Academic Year', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 7 }
    ]
  },
  {
    moduleKey: 'copyrights',
    formKey: 'copyrights-form',
    formName: 'IPRs — Copyrights Form',
    description: 'Copyright application and registration records with multi-faculty Employee ID associations.',
    tableNameRef: 'copyrights',
    fields: [
      { fieldKey: 'empIdsRaw', label: 'Employee IDs (EmpId)', fieldType: 'faculty_selector', isCore: true, isRequired: true, displayOrder: 1 },
      { fieldKey: 'title', label: 'Copyright Title', fieldType: 'long_text', isCore: true, isRequired: true, displayOrder: 2 },
      { fieldKey: 'dateOfApplication', label: 'Date of Application', fieldType: 'date', isCore: true, isRequired: true, displayOrder: 3 },
      { fieldKey: 'registrationNo', label: 'Registration No', fieldType: 'text', isCore: true, isRequired: false, displayOrder: 4 },
      { fieldKey: 'diaryNumber', label: 'Diary Number', fieldType: 'text', isCore: true, isRequired: false, displayOrder: 5 },
      { fieldKey: 'dateOfReceipt', label: 'Date of Receipt', fieldType: 'date', isCore: true, isRequired: false, displayOrder: 6 },
      { fieldKey: 'proofUrl', label: 'Proof (Google Drive Link / Document)', fieldType: 'file_upload', isCore: true, isRequired: false, displayOrder: 7 }
    ]
  },
  {
    moduleKey: 'publications',
    formKey: 'publication-form',
    formName: 'Research Publication Entry Form',
    description: 'Journal articles, conference proceedings, indexing tier, DOI, and citations.',
    tableNameRef: 'publications',
    fields: [
      { fieldKey: 'title', label: 'Paper Title', fieldType: 'long_text', isCore: true, isRequired: true, displayOrder: 1 },
      { fieldKey: 'authorName', label: 'Lead Author', fieldType: 'faculty_selector', isCore: true, isRequired: true, displayOrder: 2 },
      { fieldKey: 'journalName', label: 'Journal / Conference Name', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 3 },
      { fieldKey: 'journalType', label: 'Indexing Tier', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['Scopus', 'Web of Science', 'UGC-CARE', 'IEEE Xplore', 'Other Peer-Reviewed'], displayOrder: 4 },
      { fieldKey: 'publicationYear', label: 'Publication Year', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 5 },
      { fieldKey: 'doi', label: 'DOI', fieldType: 'text', isCore: true, isRequired: false, displayOrder: 6 },
      { fieldKey: 'citationCount', label: 'Citation Count', fieldType: 'number', isCore: true, isRequired: false, validationRules: { min: 0 }, displayOrder: 7 },
      { fieldKey: 'department', label: 'Department', fieldType: 'department_selector', isCore: true, isRequired: true, displayOrder: 8 }
    ]
  },
  {
    moduleKey: 'placements-internships',
    formKey: 'placements-internships-form',
    formName: 'Placements & Internships Offer Form',
    description: 'Student hiring & internship offers with conditional compensation fields.',
    tableNameRef: 'placements',
    fields: [
      { fieldKey: 'placementType', label: 'Record Type', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['placement', 'internship'], defaultValue: 'placement', displayOrder: 1 },
      { fieldKey: 'studentId', label: 'Student Register Number', fieldType: 'student_selector', isCore: true, isRequired: true, displayOrder: 2 },
      { fieldKey: 'studentName', label: 'Student Name', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 3 },
      { fieldKey: 'department', label: 'Department', fieldType: 'department_selector', isCore: true, isRequired: true, displayOrder: 4 },
      { fieldKey: 'batch', label: 'Academic Year / Batch', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['2026-2027', '2025-2026', '2024-2025', '2023-2024'], displayOrder: 5 },
      { fieldKey: 'company', label: 'Company / Recruiter', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 6 },
      { fieldKey: 'role', label: 'Designation / Role', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 7 },
      {
        fieldKey: 'package',
        label: 'Compensation (LPA for Placement / Monthly Stipend for Internship)',
        fieldType: 'number',
        isCore: true,
        isRequired: false,
        validationRules: { min: 0 },
        conditionalRules: [
          {
            id: 'rule-placement-pkg',
            logic: 'AND',
            conditions: [{ fieldKey: 'placementType', operator: 'equals', value: 'placement' }],
            action: 'require',
            description: 'Placement Package (LPA) is required when Record Type is Placement.'
          },
          {
            id: 'rule-internship-stipend',
            logic: 'AND',
            conditions: [{ fieldKey: 'placementType', operator: 'equals', value: 'internship' }],
            action: 'show',
            description: 'Display monthly stipend input when Record Type is Internship.'
          }
        ],
        displayOrder: 8
      },
      { fieldKey: 'placementDate', label: 'Offer Date', fieldType: 'date', isCore: true, isRequired: false, displayOrder: 9 },
      { fieldKey: 'offerLetterUrl', label: 'Offer Letter Document', fieldType: 'file_upload', isCore: true, isRequired: false, displayOrder: 10 }
    ]
  },
  {
    moduleKey: 'departmental-activities',
    formKey: 'departmental-activity-form',
    formName: 'Departmental Activity Form',
    description: 'Workshops, FDPs, seminars, and technical symposia organized by departments.',
    tableNameRef: 'departmental_activities',
    fields: [
      { fieldKey: 'title', label: 'Activity Title', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 1 },
      { fieldKey: 'activityType', label: 'Activity Category', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['FDP', 'Workshop', 'Seminar', 'Guest Lecture', 'Conference', 'Outreach'], displayOrder: 2 },
      { fieldKey: 'department', label: 'Department', fieldType: 'department_selector', isCore: true, isRequired: true, displayOrder: 3 },
      { fieldKey: 'academicYear', label: 'Academic Year', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 4 },
      { fieldKey: 'eventDate', label: 'Event Date', fieldType: 'date', isCore: true, isRequired: false, displayOrder: 5 }
    ]
  },
  {
    moduleKey: 'achievements',
    formKey: 'achievement-form',
    formName: 'Institutional Achievements Form',
    description: 'Awards, recognitions, and milestones by faculty and students.',
    tableNameRef: 'achievements',
    fields: [
      { fieldKey: 'title', label: 'Achievement Title', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 1 },
      { fieldKey: 'category', label: 'Category', fieldType: 'dropdown', isCore: true, isRequired: true, options: ['Research Award', 'Teaching Excellence', 'Student Competition', 'Institutional Honor'], displayOrder: 2 },
      { fieldKey: 'department', label: 'Department', fieldType: 'department_selector', isCore: true, isRequired: true, displayOrder: 3 },
      { fieldKey: 'academicYear', label: 'Academic Year', fieldType: 'text', isCore: true, isRequired: true, displayOrder: 4 }
    ]
  }
];

const DEFAULT_CONFIGURATIONS = [
  {
    configKey: 'academic_years',
    category: 'Academic Calendar',
    label: 'Academic Year Options & Default Scope',
    description: 'Authoritative Academic Years (AY) propagated across forms, filters, dashboards, and reports.',
    value: {
      defaultAcademicYear: '2026-2027',
      activeYears: ['AY 2026–27', 'AY 2025–26', 'AY 2024–25', 'AY 2023–24', 'AY 2022–23', 'AY 2021–22', 'AY 2020–21'],
      standardLabelPrefix: 'AY'
    }
  },
  {
    configKey: 'semesters',
    category: 'Academic Calendar',
    label: 'Semester & Term Configuration',
    description: 'Active academic term classifications for course files and activities.',
    value: {
      terms: ['Odd Semester (Jun – Nov)', 'Even Semester (Dec – May)', 'Summer Term'],
      currentTerm: 'Odd Semester (Jun – Nov)'
    }
  },
  {
    configKey: 'program_durations',
    category: 'Program Rules',
    label: 'Program Durations & Study Years',
    description: 'Standard study durations for UG, PG, and Doctoral programs.',
    value: {
      durations: { UG: '4 Years', PG: '2 Years', PhD: '3–5 Years' },
      studyYears: ['I Year', 'II Year', 'III Year', 'IV Year', 'V Year']
    }
  },
  {
    configKey: 'status_categories',
    category: 'Workflow Statuses',
    label: 'Record & Approval Status Categories',
    description: 'Standard lifecycle statuses used across Research, Student, Faculty, and Placement workflows.',
    value: {
      approvalStatuses: ['Pending', 'Verified', 'Approved', 'Needs Revision', 'Rejected'],
      facultyStatuses: ['Active', 'On Sabbatical', 'Relieved'],
      studentStatuses: ['Active', 'Graduated', 'On Leave'],
      projectStatuses: ['Ongoing', 'Completed', 'Sanctioned', 'Proposal Submitted', 'Terminated']
    }
  },
  {
    configKey: 'document_categories',
    category: 'Document Management',
    label: 'Document & Evidence Categories',
    description: 'Authorized evidence document classifications for uploads and Google Drive archival.',
    value: {
      categories: ['Agreement Letter', 'Payment Receipt', 'Offer Letter', 'Patent Certificate', 'Publication Proof', 'NAAC SSR Evidence', 'MoU Document']
    }
  },
  {
    configKey: 'upload_restrictions',
    category: 'Security & Storage',
    label: 'File Upload Restrictions & Limits',
    description: 'Global allowed file extensions and maximum upload size enforced on backend uploads.',
    value: {
      allowedExtensions: ['.pdf', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg', '.docx'],
      maxFileSizeMb: 10,
      bulkMaxRows: 5000
    }
  },
  {
    configKey: 'report_settings',
    category: 'Institutional Reporting',
    label: 'Report Export & Header Settings',
    description: 'Standard branding and AY formatting rules for Excel, PDF, and Word exports.',
    value: {
      yearNotation: 'AY',
      includeUniversityLogo: true,
      includeConfidentialFooter: true,
      defaultCurrencyUnit: 'INR'
    }
  },
  {
    configKey: 'institutional_branding',
    category: 'Branding',
    label: 'Institutional Identity & Labels',
    description: 'Official University and IQAC Cell display headers.',
    value: {
      institutionName: 'CHRIST (Deemed to be University)',
      campusSubtitle: 'Bangalore Kengeri Campus',
      iqacLabel: 'Internal Quality Assurance Cell (IQAC)',
      accreditationCycle: 'NAAC Cycle 4 (Grade A++ • 3.74 CGPA)'
    }
  }
];

let bootstrapped = false;

async function ensureSystemAdminBootstrapped(force = false) {
  if (bootstrapped && !force) return;
  try {
    // 1. Seed default roles idempotently
    for (const r of DEFAULT_ROLES) {
      await Role.findOrCreate({
        where: { code: r.code },
        defaults: r
      });
    }

    // 2. Seed default module configs idempotently
    for (const m of DEFAULT_MODULES) {
      await ModuleConfig.findOrCreate({
        where: { moduleKey: m.moduleKey },
        defaults: m
      });
    }

    // 3. Seed default system configurations idempotently
    for (const c of DEFAULT_CONFIGURATIONS) {
      await SystemConfiguration.findOrCreate({
        where: { configKey: c.configKey },
        defaults: c
      });
    }

    // 4. Seed default form definitions & fields idempotently
    for (const fDef of DEFAULT_FORMS) {
      const [form] = await FormDefinition.findOrCreate({
        where: { formKey: fDef.formKey },
        defaults: {
          moduleKey: fDef.moduleKey,
          formKey: fDef.formKey,
          formName: fDef.formName,
          description: fDef.description,
          tableNameRef: fDef.tableNameRef,
          isActive: true,
          version: 1
        }
      });

      for (const fld of fDef.fields) {
        await FormField.findOrCreate({
          where: { formId: form.id, fieldKey: fld.fieldKey },
          defaults: {
            formId: form.id,
            fieldKey: fld.fieldKey,
            label: fld.label,
            fieldType: fld.fieldType || 'text',
            isCore: fld.isCore !== undefined ? fld.isCore : true,
            isRequired: !!fld.isRequired,
            defaultValue: fld.defaultValue || null,
            validationRules: fld.validationRules || {},
            options: fld.options || [],
            conditionalRules: fld.conditionalRules || [],
            displayOrder: fld.displayOrder || 0,
            status: 'active'
          }
        });
      }
    }

    bootstrapped = true;
  } catch (err) {
    // Graceful skip if tables are not created yet during pre-migration startup
    console.warn('SystemAdminBootstrap notice (non-fatal):', err.message);
  }
}

module.exports = {
  ensureSystemAdminBootstrapped,
  ALL_PERMS,
  MODULE_KEYS,
  DEFAULT_ROLES,
  DEFAULT_MODULES,
  DEFAULT_FORMS,
  DEFAULT_CONFIGURATIONS
};

