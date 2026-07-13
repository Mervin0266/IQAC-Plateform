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
  ResearchMetric
};
