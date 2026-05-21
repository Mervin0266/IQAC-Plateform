const User = require('./User');
const Achievement = require('./Achievement');
const Document = require('./Document');
const Patent = require('./Patent');
const Placement = require('./Placement');
const StrategicPlan = require('./StrategicPlan');

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

module.exports = {
  User,
  Achievement,
  Document,
  Patent,
  Placement,
  StrategicPlan
};
