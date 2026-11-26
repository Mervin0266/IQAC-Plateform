const User = require('./User');
const Achievement = require('./Achievement');
const Award = require('./Award');
const AwardFaculty = require('./AwardFaculty');
const EContent = require('./EContent');
const EContentFaculty = require('./EContentFaculty');
const ProfessionalDevelopment = require('./ProfessionalDevelopment');
const ProfessionalDevelopmentFaculty = require('./ProfessionalDevelopmentFaculty');
const InvitedTalk = require('./InvitedTalk');
const InvitedTalkFaculty = require('./InvitedTalkFaculty');
const Periodical = require('./Periodical');
const PeriodicalFaculty = require('./PeriodicalFaculty');
const Document = require('./Document');
const Patent = require('./Patent');
const PatentProof = require('./PatentProof');
const PatentFaculty = require('./PatentFaculty');
const Copyright = require('./Copyright');
const CopyrightFaculty = require('./CopyrightFaculty');
const Placement = require('./Placement');
const StrategicPlan = require('./StrategicPlan');
const EditRequest = require('./EditRequest');
const AuditLog = require('./AuditLog');
const Notification = require('./Notification');
const Student = require('./Student');
const StudentEnrollment = require('./StudentEnrollment');
const Faculty = require('./Faculty');
const Department = require('./Department');
const ResearchMetric = require('./ResearchMetric');
const ConsultancyProject = require('./ConsultancyProject');
const ConsultancyProjectFaculty = require('./ConsultancyProjectFaculty');
const AccreditationFramework = require('./AccreditationFramework');
const AccreditationParameter = require('./AccreditationParameter');
const ParameterDataSubmission = require('./ParameterDataSubmission');
const UserDepartmentHistory = require('./UserDepartmentHistory');
const DepartmentLineage = require('./DepartmentLineage');

// ── New Academic Hierarchy Models ─────────────────────────────────
const Campus = require('./Campus');
const School = require('./School');
const ProgramLevel = require('./ProgramLevel');
const Course = require('./Course');
const DepartmentalActivity = require('./DepartmentalActivity');

// ── System Administration V2.0 Models ─────────────────────────────
const Role = require('./Role');
const UserPermissionOverride = require('./UserPermissionOverride');
const UserOrganizationalScope = require('./UserOrganizationalScope');
const FormDefinition = require('./FormDefinition');
const FormField = require('./FormField');
const SystemConfiguration = require('./SystemConfiguration');
const ModuleConfig = require('./ModuleConfig');
const ConfigurationVersion = require('./ConfigurationVersion');
const ConfigurationBackup = require('./ConfigurationBackup');
const ScopusSource = require('./ScopusSource');
const SavedReportConfig = require('./SavedReportConfig');
const ReportHistory = require('./ReportHistory');
const ReportSnapshot = require('./ReportSnapshot');
const ExchangeRate = require('./ExchangeRate');
const CustomDashboard = require('./CustomDashboard');
const CustomMetric = require('./CustomMetric');
const AnalyticsPreset = require('./AnalyticsPreset');

// ══════════════════════════════════════════════════════════════════
// Associations
// ══════════════════════════════════════════════════════════════════

// ── Academic Hierarchy: Campus → School → Department → Course ────
Campus.hasMany(School, { foreignKey: 'campusId', as: 'schools' });
School.belongsTo(Campus, { foreignKey: 'campusId', as: 'campus' });

School.hasMany(Department, { foreignKey: 'schoolId', as: 'departments' });
Department.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });

Department.hasMany(Course, { foreignKey: 'departmentId', as: 'courses' });
Course.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

ProgramLevel.hasMany(Course, { foreignKey: 'programLevelId', as: 'courses' });
Course.belongsTo(ProgramLevel, { foreignKey: 'programLevelId', as: 'programLevel' });

// Department → HOD (User)
Department.belongsTo(User, { foreignKey: 'hodId', as: 'hod' });
User.hasOne(Department, { foreignKey: 'hodId', as: 'headOfDepartment' });

// ── Existing Associations (preserved) ────────────────────────────
User.hasMany(Achievement, { foreignKey: 'createdBy', as: 'achievements' });
Achievement.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Document, { foreignKey: 'uploadedBy', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

User.hasMany(Patent, { foreignKey: 'createdBy', as: 'patents' });
Patent.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Patent Proofs
Patent.hasMany(PatentProof, { foreignKey: 'patentId', as: 'proofs', onDelete: 'CASCADE' });
PatentProof.belongsTo(Patent, { foreignKey: 'patentId', as: 'patent' });
User.hasMany(PatentProof, { foreignKey: 'uploadedBy', as: 'uploadedPatentProofs' });
PatentProof.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

// Patent & Faculty Associations
Patent.hasMany(PatentFaculty, { foreignKey: 'patentId', as: 'facultyAssociations', onDelete: 'CASCADE' });
PatentFaculty.belongsTo(Patent, { foreignKey: 'patentId', as: 'patent' });
Faculty.hasMany(PatentFaculty, { foreignKey: 'facultyId', as: 'patentAssociations' });
PatentFaculty.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });

// Copyrights & Faculty Associations
User.hasMany(Copyright, { foreignKey: 'createdBy', as: 'copyrights' });
Copyright.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Copyright.hasMany(CopyrightFaculty, { foreignKey: 'copyrightId', as: 'facultyAssociations', onDelete: 'CASCADE' });
CopyrightFaculty.belongsTo(Copyright, { foreignKey: 'copyrightId', as: 'copyright' });
Faculty.hasMany(CopyrightFaculty, { foreignKey: 'facultyId', as: 'copyrightAssociations' });
CopyrightFaculty.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });

// Awards & Faculty Associations
Award.hasMany(AwardFaculty, { foreignKey: 'awardId', as: 'facultyAssociations', onDelete: 'CASCADE' });
AwardFaculty.belongsTo(Award, { foreignKey: 'awardId', as: 'award' });
Faculty.hasMany(AwardFaculty, { foreignKey: 'facultyId', as: 'awardAssociations' });
AwardFaculty.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });

// E-Contents & Faculty Associations
EContent.hasMany(EContentFaculty, { foreignKey: 'econtentId', as: 'facultyAssociations', onDelete: 'CASCADE' });
EContentFaculty.belongsTo(EContent, { foreignKey: 'econtentId', as: 'econtent' });
Faculty.hasMany(EContentFaculty, { foreignKey: 'facultyId', as: 'econtentAssociations' });
EContentFaculty.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });

// Professional Developments & Faculty Associations
ProfessionalDevelopment.hasMany(ProfessionalDevelopmentFaculty, { foreignKey: 'professionalDevelopmentId', as: 'facultyAssociations', onDelete: 'CASCADE' });
ProfessionalDevelopmentFaculty.belongsTo(ProfessionalDevelopment, { foreignKey: 'professionalDevelopmentId', as: 'professionalDevelopment' });
Faculty.hasMany(ProfessionalDevelopmentFaculty, { foreignKey: 'facultyId', as: 'professionalDevelopmentAssociations' });
ProfessionalDevelopmentFaculty.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });

// Invited Talks & Faculty Associations
InvitedTalk.hasMany(InvitedTalkFaculty, { foreignKey: 'invitedTalkId', as: 'facultyAssociations', onDelete: 'CASCADE' });
InvitedTalkFaculty.belongsTo(InvitedTalk, { foreignKey: 'invitedTalkId', as: 'invitedTalk' });
Faculty.hasMany(InvitedTalkFaculty, { foreignKey: 'facultyId', as: 'invitedTalkAssociations' });
InvitedTalkFaculty.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });

// Periodicals & Faculty Associations
Periodical.hasMany(PeriodicalFaculty, { foreignKey: 'periodicalId', as: 'facultyAssociations', onDelete: 'CASCADE' });
PeriodicalFaculty.belongsTo(Periodical, { foreignKey: 'periodicalId', as: 'periodical' });
Faculty.hasMany(PeriodicalFaculty, { foreignKey: 'facultyId', as: 'periodicalAssociations' });
PeriodicalFaculty.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });

User.hasMany(Placement, { foreignKey: 'createdBy', as: 'placements' });
Placement.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(StrategicPlan, { foreignKey: 'createdBy', as: 'strategicPlans' });
StrategicPlan.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(EditRequest, { foreignKey: 'requestedBy', as: 'editRequests' });
EditRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });

Achievement.hasMany(EditRequest, { foreignKey: 'achievementId', as: 'editRequests' });
EditRequest.belongsTo(Achievement, { foreignKey: 'achievementId', as: 'achievement' });

User.hasMany(Notification, { foreignKey: 'recipientId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

User.hasMany(ConsultancyProject, { foreignKey: 'createdBy', as: 'consultancyProjects' });
ConsultancyProject.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

const ConsultancyDocument = require('./ConsultancyDocument');
ConsultancyProject.hasMany(ConsultancyDocument, { foreignKey: 'projectId', as: 'documents', onDelete: 'CASCADE' });
ConsultancyDocument.belongsTo(ConsultancyProject, { foreignKey: 'projectId', as: 'project' });
User.hasMany(ConsultancyDocument, { foreignKey: 'uploadedBy', as: 'uploadedConsultancyDocuments' });
ConsultancyDocument.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

// Consultancy & Faculty Associations
ConsultancyProject.hasMany(ConsultancyProjectFaculty, { foreignKey: 'projectId', as: 'facultyAssociations', onDelete: 'CASCADE' });
ConsultancyProjectFaculty.belongsTo(ConsultancyProject, { foreignKey: 'projectId', as: 'project' });
Faculty.hasMany(ConsultancyProjectFaculty, { foreignKey: 'facultyId', as: 'consultancyAssociations' });
ConsultancyProjectFaculty.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });
ConsultancyProject.belongsToMany(Faculty, { through: ConsultancyProjectFaculty, foreignKey: 'projectId', otherKey: 'facultyId', as: 'associatedFaculty' });
Faculty.belongsToMany(ConsultancyProject, { through: ConsultancyProjectFaculty, foreignKey: 'facultyId', otherKey: 'projectId', as: 'associatedConsultancyProjects' });

// Accreditation & Parameter Master Associations
AccreditationFramework.hasMany(AccreditationParameter, { foreignKey: 'frameworkId', as: 'parameters', onDelete: 'CASCADE' });
AccreditationParameter.belongsTo(AccreditationFramework, { foreignKey: 'frameworkId', as: 'framework' });

AccreditationParameter.hasMany(ParameterDataSubmission, { foreignKey: 'parameterId', as: 'submissions', onDelete: 'CASCADE' });
ParameterDataSubmission.belongsTo(AccreditationParameter, { foreignKey: 'parameterId', as: 'parameter' });

User.hasMany(AccreditationFramework, { foreignKey: 'createdBy', as: 'createdFrameworks' });
AccreditationFramework.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(ParameterDataSubmission, { foreignKey: 'submittedBy', as: 'parameterSubmissions' });
ParameterDataSubmission.belongsTo(User, { foreignKey: 'submittedBy', as: 'submitter' });

Document.hasMany(ParameterDataSubmission, { foreignKey: 'evidenceDocumentId', as: 'parameterSubmissions' });
ParameterDataSubmission.belongsTo(Document, { foreignKey: 'evidenceDocumentId', as: 'evidenceDocument' });

// Temporal History & Lineage Associations
User.hasMany(UserDepartmentHistory, { foreignKey: 'userId', as: 'departmentHistories' });
UserDepartmentHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Publication Associations
const Publication = require('./Publication');
const PublicationFaculty = require('./PublicationFaculty');
const CitationImportBatch = require('./CitationImportBatch');
const PublicationCitationSnapshot = require('./PublicationCitationSnapshot');
const CitationYearlyDetail = require('./CitationYearlyDetail');

User.hasMany(Publication, { foreignKey: 'createdBy', as: 'publications' });
Publication.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Publication.hasMany(PublicationFaculty, { foreignKey: 'publicationId', as: 'facultyAssociations', onDelete: 'CASCADE' });
PublicationFaculty.belongsTo(Publication, { foreignKey: 'publicationId', as: 'publication' });

Faculty.hasMany(PublicationFaculty, { foreignKey: 'facultyId', as: 'publicationAssociations' });
PublicationFaculty.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });

Publication.belongsToMany(Faculty, { through: PublicationFaculty, foreignKey: 'publicationId', otherKey: 'facultyId', as: 'associatedFaculty' });
Faculty.belongsToMany(Publication, { through: PublicationFaculty, foreignKey: 'facultyId', otherKey: 'publicationId', as: 'associatedPublications' });

// Citation Management Associations
Publication.hasMany(PublicationCitationSnapshot, { foreignKey: 'publicationId', as: 'citationSnapshots', onDelete: 'CASCADE' });
PublicationCitationSnapshot.belongsTo(Publication, { foreignKey: 'publicationId', as: 'publication' });

PublicationCitationSnapshot.hasMany(CitationYearlyDetail, { foreignKey: 'snapshotId', as: 'yearlyDetails', onDelete: 'CASCADE' });
CitationYearlyDetail.belongsTo(PublicationCitationSnapshot, { foreignKey: 'snapshotId', as: 'snapshot' });

User.hasMany(CitationImportBatch, { foreignKey: 'uploadedBy', as: 'citationImportBatches' });
CitationImportBatch.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

CitationImportBatch.hasMany(PublicationCitationSnapshot, { foreignKey: 'importBatchId', as: 'snapshots' });
PublicationCitationSnapshot.belongsTo(CitationImportBatch, { foreignKey: 'importBatchId', as: 'importBatch' });

// Sponsored Research Project Associations
const SponsoredProject = require('./SponsoredProject');
const SponsoredProjectFaculty = require('./SponsoredProjectFaculty');
const SponsoredResearchDocument = require('./SponsoredResearchDocument');
const SponsoredResearchInstallment = require('./SponsoredResearchInstallment');
const InternalResearchProject = require('./InternalResearchProject');
const InternalResearchFaculty = require('./InternalResearchFaculty');

User.hasMany(SponsoredProject, { foreignKey: 'createdBy', as: 'sponsoredProjects' });
SponsoredProject.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

SponsoredProject.hasMany(SponsoredResearchDocument, { foreignKey: 'projectId', as: 'documents', onDelete: 'CASCADE' });
SponsoredResearchDocument.belongsTo(SponsoredProject, { foreignKey: 'projectId', as: 'project' });
User.hasMany(SponsoredResearchDocument, { foreignKey: 'uploadedBy', as: 'uploadedSponsoredDocuments' });
SponsoredResearchDocument.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

SponsoredProject.hasMany(SponsoredResearchInstallment, { foreignKey: 'projectId', as: 'installments', onDelete: 'CASCADE' });
SponsoredResearchInstallment.belongsTo(SponsoredProject, { foreignKey: 'projectId', as: 'project' });
User.hasMany(SponsoredResearchInstallment, { foreignKey: 'createdBy', as: 'createdSponsoredInstallments' });
SponsoredResearchInstallment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Sponsored Research Multi-Investigator Associations
SponsoredProject.hasMany(SponsoredProjectFaculty, { foreignKey: 'projectId', as: 'facultyAssociations', onDelete: 'CASCADE' });
SponsoredProjectFaculty.belongsTo(SponsoredProject, { foreignKey: 'projectId', as: 'project' });
SponsoredProjectFaculty.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });
Faculty.hasMany(SponsoredProjectFaculty, { foreignKey: 'facultyId', as: 'sponsoredProjectAssociations' });

// Internal Research & Seed Money Associations
User.hasMany(InternalResearchProject, { foreignKey: 'createdBy', as: 'internalResearchProjects' });
InternalResearchProject.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
InternalResearchProject.hasMany(InternalResearchFaculty, { foreignKey: 'projectId', as: 'facultyAssociations', onDelete: 'CASCADE' });
InternalResearchFaculty.belongsTo(InternalResearchProject, { foreignKey: 'projectId', as: 'project' });
InternalResearchFaculty.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });
Faculty.hasMany(InternalResearchFaculty, { foreignKey: 'facultyId', as: 'internalResearchAssociations' });

// Achievements -> Awards & E-Contents
User.hasMany(Award, { foreignKey: 'createdBy', as: 'awards' });
Award.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Award.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });
Faculty.hasMany(Award, { foreignKey: 'facultyId', as: 'awards' });

User.hasMany(EContent, { foreignKey: 'createdBy', as: 'eContents' });
EContent.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
EContent.belongsTo(Faculty, { foreignKey: 'facultyId', as: 'faculty' });
Faculty.hasMany(EContent, { foreignKey: 'facultyId', as: 'eContents' });

// System Administration V2.0 Associations
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'assignedRole' });

User.hasMany(UserPermissionOverride, { foreignKey: 'userId', as: 'permissionOverrides', onDelete: 'CASCADE' });
UserPermissionOverride.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserOrganizationalScope, { foreignKey: 'userId', as: 'organizationalScopes', onDelete: 'CASCADE' });
UserOrganizationalScope.belongsTo(User, { foreignKey: 'userId', as: 'user' });

FormDefinition.hasMany(FormField, { foreignKey: 'formId', as: 'fields', onDelete: 'CASCADE' });
FormField.belongsTo(FormDefinition, { foreignKey: 'formId', as: 'form' });

// Student Details V3.0 Associations
Student.hasMany(StudentEnrollment, { foreignKey: 'studentId', as: 'enrollments', onDelete: 'CASCADE' });
StudentEnrollment.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

// Institutional Report Builder Associations
User.hasMany(SavedReportConfig, { foreignKey: 'createdBy', as: 'savedReportConfigs' });
SavedReportConfig.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(ReportHistory, { foreignKey: 'createdBy', as: 'generatedReports' });
ReportHistory.belongsTo(User, { foreignKey: 'createdBy', as: 'generator' });
User.hasMany(ReportSnapshot, { foreignKey: 'createdBy', as: 'reportSnapshots' });
ReportSnapshot.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = {
  User,
  Achievement,
  Award,
  AwardFaculty,
  EContent,
  EContentFaculty,
  ProfessionalDevelopment,
  ProfessionalDevelopmentFaculty,
  InvitedTalk,
  InvitedTalkFaculty,
  Periodical,
  PeriodicalFaculty,
  Publication,
  PublicationFaculty,
  CitationImportBatch,
  PublicationCitationSnapshot,
  CitationYearlyDetail,
  SponsoredProject,
  SponsoredProjectFaculty,
  SponsoredResearchDocument,
  SponsoredResearchInstallment,
  InternalResearchProject,
  InternalResearchFaculty,
  Document,
  Patent,
  PatentProof,
  PatentFaculty,
  Copyright,
  CopyrightFaculty,
  Placement,
  StrategicPlan,
  EditRequest,
  AuditLog,
  Notification,
  Student,
  StudentEnrollment,
  Faculty,
  Department,
  ResearchMetric,
  ConsultancyProject,
  ConsultancyProjectFaculty,
  ConsultancyDocument,
  AccreditationFramework,
  AccreditationParameter,
  ParameterDataSubmission,
  UserDepartmentHistory,
  DepartmentLineage,
  // New hierarchy models
  Campus,
  School,
  ProgramLevel,
  Course,
  DepartmentalActivity,
  // System Administration V2.0 models
  Role,
  UserPermissionOverride,
  UserOrganizationalScope,
  FormDefinition,
  FormField,
  SystemConfiguration,
  ModuleConfig,
  ConfigurationVersion,
  ConfigurationBackup,
  ScopusSource,
  SavedReportConfig,
  ReportHistory,
  ReportSnapshot,
  ExchangeRate,
  CustomDashboard,
  CustomMetric,
  AnalyticsPreset
};

