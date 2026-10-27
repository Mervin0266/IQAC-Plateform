'use strict';

const { Department } = require('../models');

/**
 * Resolves safe database query/delete scope based on user role and target model.
 * Enforces Option C policy: HOD/Coordinator strictly scoped to own department;
 * Admin requires dual-confirmation (confirmAll=true + confirmation phrase) for institution-wide actions.
 */
exports.resolveDepartmentScope = async (req, targetModelName, isDeleteOperation = false) => {
  const user = req.user;
  if (!user) {
    throw { status: 401, message: 'Authentication required.' };
  }

  // 1. Faculty and Authority cannot execute bulk deletion
  if (isDeleteOperation && (user.role === 'faculty' || user.role === 'authority')) {
    throw {
      status: 403,
      message: `Access denied. Users with role '${user.role}' cannot perform bulk deletion.`
    };
  }

  // 2. HOD and Coordinator are strictly locked to their assigned department
  if (user.role === 'hod' || user.role === 'coordinator' || user.role === 'faculty') {
    if (!user.department || user.department.trim() === '' || user.department === 'All') {
      throw {
        status: 403,
        message: 'Access denied: User account is not assigned to a valid department.'
      };
    }

    // Special model compatibility handling for Course (uses departmentId UUID foreign key)
    if (targetModelName === 'Course') {
      const deptRecord = await Department.findOne({
        where: { name: user.department },
        attributes: ['id']
      });
      if (!deptRecord) {
        throw { status: 404, message: `Department record not found for: ${user.department}` };
      }
      return {
        where: { departmentId: deptRecord.id },
        scopeDescription: `Department: ${user.department}`
      };
    }

    // Standard models with 'department' column
    return {
      where: { department: user.department },
      scopeDescription: `Department: ${user.department}`
    };
  }

  // 3. Administrator: scoped to department or university-wide with strong confirmation
  if (user.role === 'admin') {
    const targetDept = req.query.department || (req.body && req.body.department);
    if (targetDept && targetDept !== 'all' && targetDept !== 'All') {
      if (targetModelName === 'Course') {
        const deptRecord = await Department.findOne({
          where: { name: targetDept },
          attributes: ['id']
        });
        return {
          where: deptRecord ? { departmentId: deptRecord.id } : { departmentId: null },
          scopeDescription: `Department: ${targetDept}`
        };
      }
      return {
        where: { department: targetDept },
        scopeDescription: `Department: ${targetDept}`
      };
    }

    // For delete operations, university-wide clear requires dual-confirmation:
    // (a) confirmAll flag AND (b) confirmation string
    if (isDeleteOperation) {
      const confirmAll = req.query.confirmAll === 'true' || (req.body && req.body.confirmAll === true);
      const confirmation = req.query.confirmation || (req.body && req.body.confirmation);
      const isConfirmed = confirmation === 'CONFIRM_UNIVERSITY_CLEAR' || confirmation === 'CLEAR_ALL_CONFIRMED';

      if (!confirmAll || !isConfirmed) {
        throw {
          status: 400,
          message: 'Administrator university-wide bulk deletion requires explicit dual-confirmation (confirmAll=true and confirmation="CONFIRM_UNIVERSITY_CLEAR").'
        };
      }
    }

    return {
      where: {},
      scopeDescription: 'All University Departments'
    };
  }

  // 4. Institutional Authority (Dean): read-only across all departments
  if (user.role === 'authority') {
    const targetDept = req.query.department || (req.body && req.body.department);
    if (targetDept && targetDept !== 'all' && targetDept !== 'All') {
      if (targetModelName === 'Course') {
        const deptRecord = await Department.findOne({
          where: { name: targetDept },
          attributes: ['id']
        });
        return {
          where: deptRecord ? { departmentId: deptRecord.id } : { departmentId: null },
          scopeDescription: `Department: ${targetDept}`
        };
      }
      return {
        where: { department: targetDept },
        scopeDescription: `Department: ${targetDept}`
      };
    }
    return {
      where: {},
      scopeDescription: 'All University Departments (Authority Oversight)'
    };
  }

  throw { status: 403, message: 'Unauthorized role.' };
};
