const User = require('./User');
const Achievement = require('./Achievement');
const Document = require('./Document');
const Patent = require('./Patent');
const Placement = require('./Placement');
const StrategicPlan = require('./StrategicPlan');
const EditRequest = require('./EditRequest');
const AuditLog = require('./AuditLog');
const Notification = require('./Notification');
const Student = require('./Student');
const Faculty = require('./Faculty');
const Department = require('./Department');
const ResearchMetric = require('./ResearchMetric');
const ConsultancyProject = require('./ConsultancyProject');
const AccreditationFramework = require('./AccreditationFramework');
const AccreditationParameter = require('./AccreditationParameter');
const ParameterDataSubmission = require('./ParameterDataSubmission');

// Define associations
User.hasMany(Achievement, { foreignKey: 'createdBy', as: 'achievements' });
Achievement.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Document, { foreignKey: 'uploadedBy', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

User.hasMany(Patent, { foreignKey: 'createdBy', as: 'patents' });
Patent.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

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

const UserDepartmentHistory = require('./UserDepartmentHistory');
const DepartmentLineage = require('./DepartmentLineage');

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

module.exports = {
  User,
  Achievement,
  Document,
  Patent,
  Placement,
  StrategicPlan,
  EditRequest,
  AuditLog,
  Notification,
  Student,
  Faculty,
  Department,
  ResearchMetric,
  ConsultancyProject,
  AccreditationFramework,
  AccreditationParameter,
  ParameterDataSubmission,
  UserDepartmentHistory,
  DepartmentLineage
};
