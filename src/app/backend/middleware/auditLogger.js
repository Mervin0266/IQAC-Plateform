const { AuditLog } = require('../models');

const logAction = async ({ recordId, achievementTitle, user, action, previousValue, updatedValue, remarks }) => {
  try {
    await AuditLog.create({
      recordId,
      achievementTitle,
      userName: user.name,
      userRole: user.role,
      department: user.department,
      action,
      previousValue,
      updatedValue,
      remarks
    });
  } catch (error) {
    console.error('✗ Audit logging failed:', error);
  }
};

module.exports = { logAction };
