'use strict';

const crypto = require('crypto');
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  User,
  Role,
  UserPermissionOverride,
  UserOrganizationalScope,
  Campus,
  School,
  Department
} = require('../models');
const { logActionSafe } = require('../middleware/auditLogger');
const {
  loadGlobalConfigSnapshot,
  resolveUserAuthorizationContext,
  recordConfigVersion,
  invalidateConfigCache
} = require('../services/configPropagationService');

const newCorrelationId = () => `ADM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

// NIST-aligned strong password check (same policy as authController)
const isStrongPassword = (pwd) => {
  if (!pwd || typeof pwd !== 'string') return false;
  if (pwd.length >= 16) return true;
  if (pwd.length < 10) return false;
  return /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd) && /[@$!%*?&#^_\-]/.test(pwd);
};

// Generate compliant temporary password cleanly without exposing it in logs
const generateSecureTempPassword = () => {
  const rand = crypto.randomBytes(12).toString('base64url');
  return `Iqac#${rand}!9A`;
};

async function countActiveSystemAdmins(excludeUserId = null) {
  const sysRoles = await Role.findAll({ where: { isSystemAdmin: true, isActive: true }, attributes: ['code', 'id'], raw: true });
  const sysRoleCodes = sysRoles.length > 0 ? sysRoles.map(r => r.code) : ['admin', 'system_admin'];
  const where = {
    isActive: true,
    role: { [Op.in]: sysRoleCodes }
  };
  if (excludeUserId) {
    where.id = { [Op.ne]: excludeUserId };
  }
  return await User.count({ where });
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. USER MANAGEMENT V2.0
// ──────────────────────────────────────────────────────────────────────────────
exports.listUsers = async (req, res) => {
  try {
    await loadGlobalConfigSnapshot();
    const { search, role, status, campus, school, department } = req.query;

    const where = {};
    if (role && role !== 'all') where.role = role;
    if (status === 'active') where.isActive = true;
    else if (status === 'inactive') where.isActive = false;
    if (campus && campus !== 'all') where.campus = { [Op.iLike]: `%${campus}%` };
    if (school && school !== 'all') where.school = { [Op.iLike]: `%${school}%` };
    if (department && department !== 'all') where.department = { [Op.iLike]: `%${department}%` };
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: q } },
        { email: { [Op.iLike]: q } },
        { employeeId: { [Op.iLike]: q } },
        { department: { [Op.iLike]: q } }
      ];
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'assignedRole', attributes: ['id', 'code', 'name', 'isSystemAdmin'] },
        { model: UserOrganizationalScope, as: 'organizationalScopes' },
        { model: UserPermissionOverride, as: 'permissionOverrides' }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formatted = users.map(u => {
      const plain = u.toJSON();
      // Filter scopes if campus/school/dept query params match assigned secondary scopes too
      return {
        ...plain,
        isSystemAdmin: plain.assignedRole ? Boolean(plain.assignedRole.isSystemAdmin) : (plain.role === 'admin'),
        roleName: plain.assignedRole?.name || plain.role,
        scopesCount: (plain.organizationalScopes || []).length,
        overridesCount: (plain.permissionOverrides || []).length
      };
    });

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ success: false, message: 'Failed to load user directory.' });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const authCtx = await resolveUserAuthorizationContext(user);
    const plain = user.toJSON();

    res.json({
      success: true,
      data: {
        ...plain,
        isSystemAdmin: authCtx.isSystemAdmin,
        roleRecord: authCtx.roleRecord,
        effectivePermissions: authCtx.effectivePermissions,
        permissionProvenance: authCtx.permissionProvenance,
        overrides: authCtx.overrides,
        organizationalScopes: authCtx.scopes
      }
    });
  } catch (error) {
    console.error('Admin get user details error:', error);
    res.status(500).json({ success: false, message: 'Failed to load user details.' });
  }
};

exports.createUser = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    await loadGlobalConfigSnapshot();
    const {
      name,
      email,
      password,
      role = 'faculty',
      campus,
      school,
      department,
      employeeId,
      phone,
      isActive = true,
      mustChangePassword = true,
      organizationalScopes = []
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existingEmail = await User.findOne({ where: { email: cleanEmail } });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    if (employeeId && String(employeeId).trim()) {
      const existingEmp = await User.findOne({ where: { employeeId: String(employeeId).trim() } });
      if (existingEmp) {
        return res.status(400).json({ success: false, message: 'A user with this Employee ID already exists.' });
      }
    }

    // Validate Role exists & is active
    const roleRecord = await Role.findOne({ where: { code: role } });
    if (!roleRecord) {
      return res.status(400).json({ success: false, message: `Invalid role '${role}'.` });
    }
    if (!roleRecord.isActive) {
      return res.status(400).json({ success: false, message: `Role '${roleRecord.name}' is deactivated and cannot be assigned.` });
    }

    const effectivePwd = password && String(password).trim()
      ? String(password).trim()
      : generateSecureTempPassword();

    if (!isStrongPassword(effectivePwd)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 10 characters with uppercase, lowercase, number, and special character (or 16+ char passphrase).'
      });
    }

    const createdUser = await sequelize.transaction(async (t) => {
      const newUser = await User.create({
        name: String(name).trim(),
        email: cleanEmail,
        password: effectivePwd,
        role: roleRecord.code,
        roleId: roleRecord.id,
        campus: campus || null,
        school: school || null,
        department: department || null,
        employeeId: employeeId ? String(employeeId).trim() : null,
        phone: phone || null,
        isActive: Boolean(isActive),
        mustChangePassword: Boolean(mustChangePassword),
        tokenVersion: 0
      }, { transaction: t });

      if (Array.isArray(organizationalScopes) && organizationalScopes.length > 0) {
        for (let i = 0; i < organizationalScopes.length; i++) {
          const sc = organizationalScopes[i];
          await UserOrganizationalScope.create({
            userId: newUser.id,
            scopeType: sc.scopeType || 'department',
            campusId: sc.campusId || null,
            campusName: sc.campusName || null,
            schoolId: sc.schoolId || null,
            schoolName: sc.schoolName || null,
            departmentId: sc.departmentId || null,
            departmentName: sc.departmentName || null,
            isPrimary: i === 0 || Boolean(sc.isPrimary)
          }, { transaction: t });
        }
      }

      return newUser;
    });

    await logActionSafe({
      user: req.user,
      action: 'USER_CREATED',
      title: `Created user ${createdUser.email}`,
      module: 'User Management',
      entity: 'User',
      affectedRecordId: createdUser.id,
      updatedValue: {
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        department: createdUser.department,
        scopesCount: organizationalScopes.length
      },
      correlationId,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        department: createdUser.department,
        employeeId: createdUser.employeeId,
        isActive: createdUser.isActive,
        mustChangePassword: createdUser.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create user.' });
  }
};

exports.updateUser = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    await loadGlobalConfigSnapshot();
    const targetUser = await User.findByPk(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const {
      name,
      email,
      role,
      campus,
      school,
      department,
      employeeId,
      phone,
      organizationalScopes
    } = req.body;

    const previousSnapshot = {
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      campus: targetUser.campus,
      school: targetUser.school,
      department: targetUser.department
    };

    let targetRoleRecord = null;
    if (role && role !== targetUser.role) {
      targetRoleRecord = await Role.findOne({ where: { code: role } });
      if (!targetRoleRecord) {
        return res.status(400).json({ success: false, message: `Invalid role '${role}'.` });
      }
      if (!targetRoleRecord.isActive) {
        return res.status(400).json({ success: false, message: `Role '${targetRoleRecord.name}' is inactive.` });
      }

      // Lockout protection: cannot strip System Administrator from the last active System Admin
      const currentRoleRec = await Role.findOne({ where: { code: targetUser.role }, raw: true });
      const wasSysAdmin = currentRoleRec ? currentRoleRec.isSystemAdmin : (targetUser.role === 'admin');
      if (wasSysAdmin && !targetRoleRecord.isSystemAdmin) {
        const remainingAdmins = await countActiveSystemAdmins(targetUser.id);
        if (remainingAdmins === 0) {
          return res.status(400).json({
            success: false,
            message: 'Security Lockout Prevention: Cannot change role of the final active System Administrator.'
          });
        }
      }
    }

    await sequelize.transaction(async (t) => {
      await targetUser.update({
        name: name !== undefined ? String(name).trim() : targetUser.name,
        email: email !== undefined ? String(email).trim().toLowerCase() : targetUser.email,
        role: targetRoleRecord ? targetRoleRecord.code : targetUser.role,
        roleId: targetRoleRecord ? targetRoleRecord.id : targetUser.roleId,
        campus: campus !== undefined ? campus : targetUser.campus,
        school: school !== undefined ? school : targetUser.school,
        department: department !== undefined ? department : targetUser.department,
        employeeId: employeeId !== undefined ? employeeId : targetUser.employeeId,
        phone: phone !== undefined ? phone : targetUser.phone
      }, { transaction: t });

      if (Array.isArray(organizationalScopes)) {
        await UserOrganizationalScope.destroy({ where: { userId: targetUser.id }, transaction: t });
        for (let i = 0; i < organizationalScopes.length; i++) {
          const sc = organizationalScopes[i];
          await UserOrganizationalScope.create({
            userId: targetUser.id,
            scopeType: sc.scopeType || 'department',
            campusId: sc.campusId || null,
            campusName: sc.campusName || null,
            schoolId: sc.schoolId || null,
            schoolName: sc.schoolName || null,
            departmentId: sc.departmentId || null,
            departmentName: sc.departmentName || null,
            isPrimary: i === 0 || Boolean(sc.isPrimary)
          }, { transaction: t });
        }
      }
    });

    const roleChanged = Boolean(targetRoleRecord && targetRoleRecord.code !== previousSnapshot.role);

    await logActionSafe({
      user: req.user,
      action: roleChanged ? 'USER_ROLE_CHANGED' : 'USER_UPDATED',
      title: `Updated user ${targetUser.email}`,
      module: 'User Management',
      entity: 'User',
      affectedRecordId: targetUser.id,
      previousValue: previousSnapshot,
      updatedValue: {
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        campus: targetUser.campus,
        school: targetUser.school,
        department: targetUser.department
      },
      correlationId,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'User account updated successfully.' });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update user.' });
  }
};

exports.deactivateUser = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const targetUser = await User.findByPk(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Administrators cannot deactivate their own active account.' });
    }

    const currentRoleRec = await Role.findOne({ where: { code: targetUser.role }, raw: true });
    const isSysAdmin = currentRoleRec ? currentRoleRec.isSystemAdmin : (targetUser.role === 'admin');
    if (isSysAdmin) {
      const remainingAdmins = await countActiveSystemAdmins(targetUser.id);
      if (remainingAdmins === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lockout Protection: Cannot deactivate the final active System Administrator.'
        });
      }
    }

    const reason = (req.body && req.body.reason) || 'Deactivated by System Administrator';

    // Immediately deactivate AND invalidate active JWT sessions via tokenVersion increment
    await targetUser.update({
      isActive: false,
      deactivatedAt: new Date(),
      deactivatedBy: req.user.id,
      deactivationReason: reason,
      tokenVersion: (targetUser.tokenVersion || 0) + 1
    });

    await logActionSafe({
      user: req.user,
      action: 'USER_DEACTIVATED',
      title: `Deactivated ${targetUser.email}`,
      module: 'User Management',
      entity: 'User',
      affectedRecordId: targetUser.id,
      previousValue: { isActive: true },
      updatedValue: { isActive: false, deactivatedAt: targetUser.deactivatedAt },
      reason,
      correlationId,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Account for ${targetUser.name} deactivated and active sessions revoked. Historical records remain preserved.`
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate user account.' });
  }
};

exports.activateUser = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const targetUser = await User.findByPk(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await targetUser.update({
      isActive: true,
      deactivatedAt: null,
      deactivatedBy: null,
      deactivationReason: null
    });

    await logActionSafe({
      user: req.user,
      action: 'USER_ACTIVATED',
      title: `Activated ${targetUser.email}`,
      module: 'User Management',
      entity: 'User',
      affectedRecordId: targetUser.id,
      previousValue: { isActive: false },
      updatedValue: { isActive: true },
      correlationId,
      ipAddress: req.ip
    });

    res.json({ success: true, message: `Account for ${targetUser.name} activated.` });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate user account.' });
  }
};

exports.revokeUserSessions = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const targetUser = await User.findByPk(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await targetUser.update({
      tokenVersion: (targetUser.tokenVersion || 0) + 1
    });

    await logActionSafe({
      user: req.user,
      action: 'USER_SESSIONS_REVOKED',
      title: `Revoked active sessions for ${targetUser.email}`,
      module: 'User Management',
      entity: 'User',
      affectedRecordId: targetUser.id,
      reason: (req.body && req.body.reason) || 'Administrator session revocation',
      correlationId,
      ipAddress: req.ip
    });

    res.json({ success: true, message: `All active sessions for ${targetUser.name} have been invalidated.` });
  } catch (error) {
    console.error('Revoke sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke sessions.' });
  }
};

exports.resetUserPassword = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const targetUser = await User.findByPk(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { newPassword, forceChangeOnNextLogin = true } = req.body;
    let passwordUpdated = false;

    if (newPassword && String(newPassword).trim()) {
      if (!isStrongPassword(String(newPassword).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 10 characters with uppercase, lowercase, number, and special character (or 16+ char passphrase).'
        });
      }
      targetUser.password = String(newPassword).trim();
      targetUser.passwordChangedAt = new Date();
      passwordUpdated = true;
    }

    targetUser.mustChangePassword = Boolean(forceChangeOnNextLogin);
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
    await targetUser.save();

    await logActionSafe({
      user: req.user,
      action: passwordUpdated ? 'USER_PASSWORD_RESET_BY_ADMIN' : 'FORCE_PASSWORD_CHANGE_FLAGGED',
      title: `Security credential reset for ${targetUser.email}`,
      module: 'User Management',
      entity: 'User',
      affectedRecordId: targetUser.id,
      updatedValue: { mustChangePassword: targetUser.mustChangePassword, sessionsRevoked: true },
      correlationId,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: passwordUpdated
        ? `Password securely reset, sessions invalidated, and password change required on next login.`
        : `User flagged for mandatory password change on next login and active sessions revoked.`
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({ success: false, message: 'Failed to process credential reset.' });
  }
};

exports.updateUserPermissionOverrides = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const targetUser = await User.findByPk(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { overrides = [], reason } = req.body;
    if (!Array.isArray(overrides)) {
      return res.status(400).json({ success: false, message: 'Overrides must be an array.' });
    }

    // Prevent non-admin permission escalation to system-admin
    const sanitizedOverrides = overrides.filter(
      o => o.moduleKey && o.permission && ['grant', 'restrict'].includes(o.effect) && o.moduleKey !== 'system-admin'
    );

    const existing = await UserPermissionOverride.findAll({ where: { userId: targetUser.id }, raw: true });

    await sequelize.transaction(async (t) => {
      await UserPermissionOverride.destroy({ where: { userId: targetUser.id }, transaction: t });
      for (const ov of sanitizedOverrides) {
        await UserPermissionOverride.create({
          userId: targetUser.id,
          moduleKey: ov.moduleKey,
          permission: ov.permission,
          effect: ov.effect,
          reason: ov.reason || reason || null,
          updatedBy: req.user.id
        }, { transaction: t });
      }
      await recordConfigVersion({
        configId: `user_perms:${targetUser.id}`,
        entityType: 'user_permissions',
        entityName: `Permission Overrides: ${targetUser.email}`,
        previousConfig: existing,
        newConfig: sanitizedOverrides,
        user: req.user,
        reason: reason || 'Updated individual user permission overrides',
        transaction: t
      });
    });

    await logActionSafe({
      user: req.user,
      action: 'USER_PERMISSION_OVERRIDES_UPDATED',
      title: `Updated permission overrides for ${targetUser.email}`,
      module: 'User Management',
      entity: 'UserPermissionOverride',
      affectedRecordId: targetUser.id,
      previousValue: existing,
      updatedValue: sanitizedOverrides,
      reason: reason || null,
      correlationId,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Individual permission overrides saved.' });
  } catch (error) {
    console.error('Update permission overrides error:', error);
    res.status(500).json({ success: false, message: 'Failed to update permission overrides.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 2. USER BULK UPLOAD (Excel Template, Preview Validation, Safe Row Import)
// ──────────────────────────────────────────────────────────────────────────────
exports.downloadUserBulkTemplate = async (req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const headers = [
      ['Name', 'Email', 'EmployeeID', 'Role', 'Campus', 'School', 'Department', 'Phone']
    ];
    const sampleRow = [
      ['Dr. Example Faculty', 'example.faculty@christuniversity.in', 'EMP202601', 'faculty', 'Kengeri Campus', 'School of Engineering and Technology', 'Computer Science and Engineering', '9876543210']
    ];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleRow]);
    XLSX.utils.book_append_sheet(wb, ws, 'Users_Template');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="IQAC_Bulk_Users_Template.xlsx"');
    res.send(buf);
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel template.' });
  }
};

async function validateBulkUserRows(rows = []) {
  const [existingUsers, roles, campuses, schools, departments] = await Promise.all([
    User.findAll({ attributes: ['id', 'email', 'employeeId'], raw: true }),
    Role.findAll({ where: { isActive: true }, attributes: ['id', 'code', 'name'], raw: true }),
    Campus.findAll({ where: { status: 'Active' }, attributes: ['id', 'name'], raw: true }),
    School.findAll({ where: { status: 'Active' }, attributes: ['id', 'name'], raw: true }),
    Department.findAll({ where: { status: 'Active' }, attributes: ['id', 'name', 'shortName', 'code'], raw: true })
  ]);

  const existingEmailSet = new Set(existingUsers.map(u => String(u.email).toLowerCase()));
  const existingEmpSet = new Set(existingUsers.filter(u => u.employeeId).map(u => String(u.employeeId).trim().toLowerCase()));
  const validRoleMap = new Map();
  roles.forEach(r => {
    validRoleMap.set(r.code.toLowerCase(), r);
    validRoleMap.set(r.name.toLowerCase(), r);
  });

  const deptSet = new Set();
  departments.forEach(d => {
    deptSet.add(d.name.toLowerCase());
    if (d.shortName) deptSet.add(d.shortName.toLowerCase());
    if (d.code) deptSet.add(d.code.toLowerCase());
  });

  const seenBatchEmails = new Set();
  const seenBatchEmpIds = new Set();

  return rows.map((raw, idx) => {
    const rowNum = idx + 2;
    const name = String(raw.Name || raw.name || '').trim();
    const email = String(raw.Email || raw.email || '').trim().toLowerCase();
    const empId = String(raw.EmployeeID || raw.employeeId || '').trim();
    const roleRaw = String(raw.Role || raw.role || 'faculty').trim();
    const campus = String(raw.Campus || raw.campus || '').trim();
    const school = String(raw.School || raw.school || '').trim();
    const dept = String(raw.Department || raw.department || '').trim();
    const phone = String(raw.Phone || raw.phone || '').trim();

    const errors = [];
    if (!name) errors.push('Missing Name');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid or missing Email');
    if (email && existingEmailSet.has(email)) errors.push('Email already exists in platform (will not overwrite)');
    if (email && seenBatchEmails.has(email)) errors.push('Duplicate email in upload sheet');
    if (empId && existingEmpSet.has(empId.toLowerCase())) errors.push('Employee ID already exists');
    if (empId && seenBatchEmpIds.has(empId.toLowerCase())) errors.push('Duplicate Employee ID in sheet');

    const matchedRole = validRoleMap.get(roleRaw.toLowerCase());
    if (!matchedRole) errors.push(`Invalid or inactive role '${roleRaw}'`);

    if (dept && departments.length > 0 && !deptSet.has(dept.toLowerCase())) {
      errors.push(`Unrecognized department '${dept}'`);
    }
    if (campus && campuses.length > 0 && !campuses.some(c => c.name.toLowerCase() === campus.toLowerCase())) {
      errors.push(`Unrecognized campus '${campus}'`);
    }
    if (school && schools.length > 0 && !schools.some(s => s.name.toLowerCase() === school.toLowerCase())) {
      errors.push(`Unrecognized school '${school}'`);
    }

    if (email) seenBatchEmails.add(email);
    if (empId) seenBatchEmpIds.add(empId.toLowerCase());

    const canonicalDept = departments.find(
      d => d.name.toLowerCase() === dept.toLowerCase() || (d.shortName && d.shortName.toLowerCase() === dept.toLowerCase())
    );

    return {
      rowNumber: rowNum,
      valid: errors.length === 0,
      errors,
      normalized: {
        name,
        email,
        employeeId: empId || null,
        role: matchedRole ? matchedRole.code : roleRaw,
        roleId: matchedRole ? matchedRole.id : null,
        campus: campus || null,
        school: school || null,
        department: canonicalDept ? canonicalDept.name : (dept || null),
        phone: phone || null
      }
    };
  });
}

exports.previewUserBulkUpload = async (req, res) => {
  try {
    await loadGlobalConfigSnapshot();
    const { rows = [] } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows supplied for preview.' });
    }

    const validated = await validateBulkUserRows(rows);
    const validCount = validated.filter(r => r.valid).length;

    res.json({
      success: true,
      data: {
        totalRows: validated.length,
        validCount,
        invalidCount: validated.length - validCount,
        rows: validated
      }
    });
  } catch (error) {
    console.error('Bulk user preview error:', error);
    res.status(500).json({ success: false, message: 'Failed to preview bulk user file.' });
  }
};

exports.importUsersBulk = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    await loadGlobalConfigSnapshot();
    const { rows = [] } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows supplied for import.' });
    }

    const validated = await validateBulkUserRows(rows);
    const results = [];
    let importedCount = 0;

    for (const item of validated) {
      if (!item.valid) {
        results.push({ rowNumber: item.rowNumber, email: item.normalized.email, status: 'skipped', reason: item.errors.join('; ') });
        continue;
      }

      try {
        const tempPwd = generateSecureTempPassword();
        const created = await User.create({
          name: item.normalized.name,
          email: item.normalized.email,
          password: tempPwd,
          role: item.normalized.role,
          roleId: item.normalized.roleId,
          campus: item.normalized.campus,
          school: item.normalized.school,
          department: item.normalized.department,
          employeeId: item.normalized.employeeId,
          phone: item.normalized.phone,
          isActive: true,
          mustChangePassword: true,
          tokenVersion: 0
        });
        importedCount++;
        results.push({ rowNumber: item.rowNumber, email: created.email, status: 'imported', id: created.id });
      } catch (rowErr) {
        results.push({ rowNumber: item.rowNumber, email: item.normalized.email, status: 'error', reason: rowErr.message });
      }
    }

    await logActionSafe({
      user: req.user,
      action: 'USERS_BULK_IMPORTED',
      title: `Bulk imported ${importedCount} users`,
      module: 'User Management',
      entity: 'User',
      updatedValue: { totalSubmitted: validated.length, importedCount, skippedCount: validated.length - importedCount },
      correlationId,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: {
        totalSubmitted: validated.length,
        importedCount,
        skippedCount: validated.length - importedCount,
        results
      }
    });
  } catch (error) {
    console.error('Bulk import users error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete bulk user import.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 3. ROLES & PERMISSIONS MANAGEMENT
// ──────────────────────────────────────────────────────────────────────────────
exports.listRoles = async (req, res) => {
  try {
    await loadGlobalConfigSnapshot();
    const [roles, users] = await Promise.all([
      Role.findAll({ order: [['isSystem', 'DESC'], ['name', 'ASC']], raw: true }),
      User.findAll({ attributes: ['id', 'name', 'email', 'role', 'roleId', 'isActive', 'department'], raw: true })
    ]);

    const enriched = roles.map(r => {
      const assignedUsers = users.filter(u => u.roleId === r.id || u.role === r.code);
      return {
        ...r,
        userCount: assignedUsers.length,
        assignedUsers
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('List roles error:', error);
    res.status(500).json({ success: false, message: 'Failed to load roles.' });
  }
};

exports.createRole = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { name, code, description, defaultScope = 'department', permissions = {}, reason } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required.' });
    }

    const cleanCode = (code ? String(code) : String(name))
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_');

    const existing = await Role.findOne({
      where: { [Op.or]: [{ code: cleanCode }, { name: String(name).trim() }] }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A role with this name or code already exists.' });
    }

    const created = await sequelize.transaction(async (t) => {
      const role = await Role.create({
        code: cleanCode,
        name: String(name).trim(),
        description: description || '',
        isSystem: false,
        isSystemAdmin: false, // Custom roles never elevate to System Administrator
        isActive: true,
        defaultScope,
        permissions,
        createdBy: req.user.id,
        updatedBy: req.user.id
      }, { transaction: t });

      await recordConfigVersion({
        configId: `role:${role.code}`,
        entityType: 'role',
        entityName: role.name,
        previousConfig: null,
        newConfig: role.toJSON(),
        user: req.user,
        reason: reason || 'Custom role created',
        transaction: t
      });

      return role;
    });

    await logActionSafe({
      user: req.user,
      action: 'ROLE_CREATED',
      title: `Created role ${created.name}`,
      module: 'Roles & Permissions',
      entity: 'Role',
      affectedRecordId: created.id,
      updatedValue: { code: created.code, name: created.name, defaultScope },
      reason: reason || null,
      correlationId,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create role.' });
  }
};

exports.updateRole = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const { name, description, defaultScope, permissions, reason } = req.body;
    const prevSnapshot = role.toJSON();

    // Safeguard: System Administrator role retains full system-admin permissions
    const nextPermissions = role.isSystemAdmin ? prevSnapshot.permissions : (permissions || role.permissions);

    await sequelize.transaction(async (t) => {
      await role.update({
        name: name ? String(name).trim() : role.name,
        description: description !== undefined ? description : role.description,
        defaultScope: defaultScope || role.defaultScope,
        permissions: nextPermissions,
        updatedBy: req.user.id
      }, { transaction: t });

      await recordConfigVersion({
        configId: `role:${role.code}`,
        entityType: 'role',
        entityName: role.name,
        previousConfig: prevSnapshot,
        newConfig: role.toJSON(),
        user: req.user,
        reason: reason || 'Role permissions/details updated',
        transaction: t
      });
    });

    invalidateConfigCache();

    await logActionSafe({
      user: req.user,
      action: 'ROLE_PERMISSIONS_UPDATED',
      title: `Updated role ${role.name}`,
      module: 'Roles & Permissions',
      entity: 'Role',
      affectedRecordId: role.id,
      previousValue: { name: prevSnapshot.name, defaultScope: prevSnapshot.defaultScope },
      updatedValue: { name: role.name, defaultScope: role.defaultScope },
      reason: reason || null,
      correlationId,
      ipAddress: req.ip
    });

    res.json({ success: true, data: role, message: `Role '${role.name}' updated.` });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update role.' });
  }
};

exports.deactivateRole = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    if (role.isSystemAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Security Lockout Protection: The System Administrator role cannot be deactivated.'
      });
    }

    const { reassignToRoleCode, reason } = req.body;
    const affectedUsers = await User.findAll({
      where: { [Op.or]: [{ roleId: role.id }, { role: role.code }] },
      attributes: ['id', 'name', 'email'],
      raw: true
    });

    if (affectedUsers.length > 0 && !reassignToRoleCode) {
      return res.status(409).json({
        success: false,
        code: 'REASSIGNMENT_REQUIRED',
        message: `${affectedUsers.length} user(s) are currently assigned to '${role.name}'. Please specify a reassignment role before deactivating.`,
        affectedUsers
      });
    }

    let targetRole = null;
    if (reassignToRoleCode) {
      targetRole = await Role.findOne({ where: { code: reassignToRoleCode, isActive: true } });
      if (!targetRole || targetRole.id === role.id) {
        return res.status(400).json({ success: false, message: 'Invalid active target role for reassignment.' });
      }
    }

    await sequelize.transaction(async (t) => {
      if (affectedUsers.length > 0 && targetRole) {
        await User.update(
          { role: targetRole.code, roleId: targetRole.id },
          { where: { [Op.or]: [{ roleId: role.id }, { role: role.code }] }, transaction: t }
        );
      }
      await role.update({ isActive: false, updatedBy: req.user.id }, { transaction: t });

      await recordConfigVersion({
        configId: `role:${role.code}`,
        entityType: 'role',
        entityName: role.name,
        previousConfig: { isActive: true },
        newConfig: { isActive: false, reassignedCount: affectedUsers.length, reassignedTo: targetRole?.code || null },
        user: req.user,
        reason: reason || 'Role deactivated',
        transaction: t
      });
    });

    await logActionSafe({
      user: req.user,
      action: 'ROLE_DEACTIVATED',
      title: `Deactivated role ${role.name}`,
      module: 'Roles & Permissions',
      entity: 'Role',
      affectedRecordId: role.id,
      updatedValue: { isActive: false, reassignedCount: affectedUsers.length, reassignedTo: targetRole?.code || null },
      reason: reason || null,
      correlationId,
      ipAddress: req.ip
    });

    res.json({ success: true, message: `Role '${role.name}' deactivated.` });
  } catch (error) {
    console.error('Deactivate role error:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate role.' });
  }
};

exports.activateRole = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });

    await role.update({ isActive: true, updatedBy: req.user.id });
    invalidateConfigCache();

    await logActionSafe({
      user: req.user,
      action: 'ROLE_ACTIVATED',
      title: `Restored role ${role.name}`,
      module: 'Roles & Permissions',
      entity: 'Role',
      affectedRecordId: role.id,
      correlationId,
      ipAddress: req.ip
    });

    res.json({ success: true, data: role, message: `Role '${role.name}' activated.` });
  } catch (error) {
    console.error('Activate role error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate role.' });
  }
};

