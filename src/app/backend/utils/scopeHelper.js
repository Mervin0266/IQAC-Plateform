'use strict';

const { Op } = require('sequelize');
const { Department, School, Campus } = require('../models');

/**
 * Resolves all authorized department names for a user considering multi-organizational scopes
 * (Campuses, Schools, Departments) as well as legacy single user.department.
 */
async function resolveAllowedDepartmentsForUser(user) {
  const scopes = Array.isArray(user.assignedScopes) ? user.assignedScopes : [];
  const hasUnivScope = user.isSystemAdmin ||
    user.role === 'admin' ||
    user.role === 'authority' ||
    user.role === 'iqac_admin' ||
    scopes.some(s => s.scopeType === 'university');

  if (hasUnivScope) {
    return { isUniversityWide: true, departments: [] };
  }

  const deptNames = new Set();
  if (user.department && user.department.trim() !== '' && user.department !== 'All') {
    deptNames.add(user.department.trim());
  }

  // Expand campus and school scopes into department names safely
  const campusIds = scopes.filter(s => s.scopeType === 'campus' && s.campusId).map(s => s.campusId);
  const schoolIds = scopes.filter(s => s.scopeType === 'school' && s.schoolId).map(s => s.schoolId);

  if (campusIds.length > 0 && School) {
    try {
      const campusSchools = await School.findAll({ where: { campusId: { [Op.in]: campusIds } }, attributes: ['id'], raw: true });
      campusSchools.forEach(s => schoolIds.push(s.id));
    } catch (e) {}
  }

  if (schoolIds.length > 0 && Department) {
    try {
      const schoolDepts = await Department.findAll({ where: { schoolId: { [Op.in]: schoolIds } }, attributes: ['name'], raw: true });
      schoolDepts.forEach(d => deptNames.add(d.name));
    } catch (e) {}
  }

  scopes.forEach(s => {
    if (s.departmentName && s.departmentName.trim() !== '') {
      deptNames.add(s.departmentName.trim());
    }
  });

  return {
    isUniversityWide: false,
    departments: Array.from(deptNames)
  };
}

/**
 * Resolves safe database query/delete scope based on user role, multi-org scopes, and target model.
 * Enforces Option C policy: HOD/Coordinator strictly scoped to assigned department(s);
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

  const resolvedScope = await resolveAllowedDepartmentsForUser(user);

  // 2. Scoped users (HOD, Coordinator, Faculty, or Custom Roles with campus/school/department scope)
  if (!resolvedScope.isUniversityWide) {
    const allowedDepts = resolvedScope.departments;
    if (!allowedDepts || allowedDepts.length === 0) {
      throw {
        status: 403,
        message: 'Access denied: User account is not assigned to a valid department.'
      };
    }

    const reqDept = (req.query && req.query.department) || (req.body && req.body.department);
    let targetDepts = allowedDepts;

    if (reqDept && reqDept !== 'all' && reqDept !== 'All') {
      const normReq = reqDept.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matched = allowedDepts.find(d => d.toLowerCase().replace(/[^a-z0-9]/g, '') === normReq);
      if (!matched) {
        throw {
          status: 403,
          message: `Access denied. You do not have access to department '${reqDept}'.`
        };
      }
      targetDepts = [matched];
    }

    if (targetModelName === 'Course') {
      const deptRecords = await Department.findAll({
        where: targetDepts.length === 1 ? { name: targetDepts[0] } : { name: { [Op.in]: targetDepts } },
        attributes: ['id']
      });
      if (!deptRecords || deptRecords.length === 0) {
        throw { status: 404, message: `Department record not found for: ${targetDepts.join(', ')}` };
      }
      const ids = deptRecords.map(d => d.id);
      return {
        where: ids.length === 1 ? { departmentId: ids[0] } : { departmentId: { [Op.in]: ids } },
        scopeDescription: `Department: ${targetDepts.join(', ')}`
      };
    }

    return {
      where: targetDepts.length === 1 ? { department: targetDepts[0] } : { department: { [Op.in]: targetDepts } },
      scopeDescription: `Department: ${targetDepts.join(', ')}`
    };
  }

  // 3. University-wide Administrator / IQAC Admin: scoped to department or university-wide with strong confirmation
  if (user.isSystemAdmin || user.role === 'admin' || user.role === 'iqac_admin') {
    const targetDept = (req.query && req.query.department) || (req.body && req.body.department);
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

    if (isDeleteOperation) {
      const confirmAll = (req.query && req.query.confirmAll === 'true') || (req.body && req.body.confirmAll === true);
      const confirmation = (req.query && req.query.confirmation) || (req.body && req.body.confirmation);
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

  // 4. Institutional Authority (Dean) / University-wide non-admin oversight
  const targetDept = (req.query && req.query.department) || (req.body && req.body.department);
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
};

exports.resolveAllowedDepartmentsForUser = resolveAllowedDepartmentsForUser;
