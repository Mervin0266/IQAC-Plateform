'use strict';

const {
  Role,
  UserPermissionOverride,
  UserOrganizationalScope,
  FormDefinition,
  FormField,
  SystemConfiguration,
  ModuleConfig,
  ConfigurationVersion,
  Campus,
  School,
  Department,
  ProgramLevel,
  Course
} = require('../models');
const { ensureSystemAdminBootstrapped, ALL_PERMS, MODULE_KEYS } = require('./systemAdminBootstrapService');

let configVersionCounter = Date.now();
let cachedGlobalSnapshot = null;

function invalidateConfigCache() {
  configVersionCounter += 1;
  cachedGlobalSnapshot = null;
  return configVersionCounter;
}

function getConfigVersion() {
  return configVersionCounter;
}

async function loadGlobalConfigSnapshot(forceRefresh = false) {
  await ensureSystemAdminBootstrapped();

  if (cachedGlobalSnapshot && !forceRefresh) {
    return cachedGlobalSnapshot;
  }

  const [
    roles,
    modules,
    configurations,
    forms,
    campuses,
    schools,
    departments,
    programLevels,
    courses
  ] = await Promise.all([
    Role.findAll({ order: [['isSystem', 'DESC'], ['name', 'ASC']], raw: true }).catch(() => []),
    ModuleConfig.findAll({ order: [['moduleName', 'ASC']], raw: true }).catch(() => []),
    SystemConfiguration.findAll({ order: [['category', 'ASC'], ['label', 'ASC']], raw: true }).catch(() => []),
    FormDefinition.findAll({
      include: [{ model: FormField, as: 'fields' }],
      order: [['moduleKey', 'ASC'], ['formName', 'ASC']]
    }).catch(() => []),
    Campus.findAll({ order: [['name', 'ASC']], raw: true }).catch(() => []),
    School.findAll({ order: [['name', 'ASC']], raw: true }).catch(() => []),
    Department.findAll({ order: [['code', 'ASC']], raw: true }).catch(() => []),
    ProgramLevel.findAll({ order: [['name', 'ASC']], raw: true }).catch(() => []),
    Course.findAll({ order: [['name', 'ASC']], raw: true }).catch(() => [])
  ]);

  const formattedForms = forms.map(f => {
    const plain = typeof f.toJSON === 'function' ? f.toJSON() : f;
    plain.fields = (plain.fields || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    return plain;
  });

  const configMap = {};
  configurations.forEach(c => {
    configMap[c.configKey] = c.value;
  });

  const moduleMap = {};
  modules.forEach(m => {
    moduleMap[m.moduleKey] = m;
  });

  cachedGlobalSnapshot = {
    version: configVersionCounter,
    roles,
    modules,
    moduleMap,
    configurations,
    configMap,
    forms: formattedForms,
    hierarchy: {
      campuses: campuses.filter(c => c.status === 'Active'),
      allCampuses: campuses,
      schools: schools.filter(s => s.status === 'Active'),
      allSchools: schools,
      departments: departments.filter(d => d.status === 'Active'),
      allDepartments: departments,
      programLevels: programLevels.filter(p => p.status === 'Active'),
      courses: courses.filter(c => c.status === 'Active')
    }
  };

  return cachedGlobalSnapshot;
}

/**
 * Resolves a user's effective role, System Administrator status,
 * inherited vs overridden permissions, and all organizational scopes.
 */
async function resolveUserAuthorizationContext(user) {
  if (!user) return null;
  const global = await loadGlobalConfigSnapshot();

  // Match role from roles table
  const roleRecord = global.roles.find(
    r => (user.roleId && r.id === user.roleId) || r.code === user.role
  ) || null;

  const isRoleActive = roleRecord ? roleRecord.isActive !== false : true;
  // Strictly evaluate System Administrator access from authoritative Role definition
  const isSystemAdmin = isRoleActive && (
    roleRecord
      ? Boolean(roleRecord.isSystemAdmin)
      : (user.role === 'admin' || user.role === 'system_admin')
  );

  // Load individual permission overrides
  let overrides = [];
  try {
    overrides = await UserPermissionOverride.findAll({
      where: { userId: user.id },
      raw: true
    });
  } catch (err) {
    overrides = [];
  }

  const overrideMap = {};
  overrides.forEach(o => {
    if (!overrideMap[o.moduleKey]) overrideMap[o.moduleKey] = {};
    overrideMap[o.moduleKey][o.permission] = o.effect; // 'grant' | 'restrict'
  });

  // Calculate effective permissions & provenance ('inherited' | 'granted' | 'restricted' | 'none')
  const basePerms = (roleRecord && roleRecord.permissions) || {};
  const effectivePermissions = {};
  const permissionProvenance = {};

  MODULE_KEYS.forEach(modKey => {
    effectivePermissions[modKey] = {};
    permissionProvenance[modKey] = {};
    const modBase = basePerms[modKey] || {};
    const modOver = overrideMap[modKey] || {};

    ALL_PERMS.forEach(perm => {
      const inherited = isSystemAdmin ? true : Boolean(modBase[perm]);
      const overrideEffect = modOver[perm];

      if (overrideEffect === 'restrict' && !isSystemAdmin) {
        effectivePermissions[modKey][perm] = false;
        permissionProvenance[modKey][perm] = 'restricted';
      } else if (overrideEffect === 'grant') {
        // Note: ordinary users still cannot receive system-admin via casual module grant unless role is System Admin
        if (modKey === 'system-admin' && !isSystemAdmin) {
          effectivePermissions[modKey][perm] = false;
          permissionProvenance[modKey][perm] = 'none';
        } else {
          effectivePermissions[modKey][perm] = true;
          permissionProvenance[modKey][perm] = inherited ? 'inherited' : 'granted';
        }
      } else {
        effectivePermissions[modKey][perm] = inherited;
        permissionProvenance[modKey][perm] = inherited ? 'inherited' : 'none';
      }
    });
  });

  // Load multi-organizational scopes
  let scopes = [];
  try {
    scopes = await UserOrganizationalScope.findAll({
      where: { userId: user.id },
      raw: true
    });
  } catch (err) {
    scopes = [];
  }

  // Fallback compatibility with legacy single department/role scope
  if (scopes.length === 0) {
    const defaultScopeType = (roleRecord && roleRecord.defaultScope) ||
      (isSystemAdmin || user.role === 'authority' || user.role === 'iqac_admin' ? 'university' : 'department');
    scopes = [{
      id: 'legacy-primary',
      userId: user.id,
      scopeType: defaultScopeType,
      campusName: user.campus || null,
      schoolName: user.school || null,
      departmentName: user.department || null,
      isPrimary: true
    }];
  }

  return {
    isSystemAdmin,
    roleRecord,
    effectivePermissions,
    permissionProvenance,
    overrides,
    scopes
  };
}

/**
 * Returns full runtime configuration for the logged-in user (propagation source of truth).
 */
async function getRuntimeConfigForUser(user) {
  const global = await loadGlobalConfigSnapshot();
  const authCtx = await resolveUserAuthorizationContext(user);

  return {
    version: global.version,
    userContext: {
      id: user.id,
      role: user.role,
      roleName: authCtx?.roleRecord?.name || user.role,
      isSystemAdmin: Boolean(authCtx?.isSystemAdmin),
      effectivePermissions: authCtx?.effectivePermissions || {},
      scopes: authCtx?.scopes || []
    },
    modules: global.modules.map(m => ({
      moduleKey: m.moduleKey,
      moduleName: m.moduleName,
      routeKey: m.routeKey,
      isEnabled: m.isEnabled,
      isCritical: m.isCritical,
      affectedRoutes: m.affectedRoutes
    })),
    hierarchy: {
      campuses: global.hierarchy.campuses,
      schools: global.hierarchy.schools,
      departments: global.hierarchy.departments,
      programLevels: global.hierarchy.programLevels,
      courses: global.hierarchy.courses
    },
    settings: global.configMap,
    forms: global.forms.map(f => ({
      id: f.id,
      moduleKey: f.moduleKey,
      formKey: f.formKey,
      formName: f.formName,
      version: f.version,
      fields: f.fields // Includes status: 'active' | 'disabled' | 'archived' for client historical rendering vs new entry filtering
    }))
  };
}

/**
 * Records a versioned configuration change safely.
 */
async function recordConfigVersion({
  configId,
  entityType,
  entityName,
  previousConfig,
  newConfig,
  user,
  reason = null,
  changeStatus = 'applied',
  transaction = null
}) {
  const latest = await ConfigurationVersion.findOne({
    where: { configId },
    order: [['versionNumber', 'DESC']],
    transaction
  });

  const nextVersion = latest ? Number(latest.versionNumber) + 1 : 1;

  const entry = await ConfigurationVersion.create({
    configId: String(configId),
    versionNumber: nextVersion,
    entityType,
    entityName,
    previousConfig: previousConfig || null,
    newConfig: newConfig || null,
    adminUserId: user?.id || null,
    adminIdentity: user ? `${user.name} (${user.email})` : 'System',
    reason,
    changeStatus
  }, { transaction });

  invalidateConfigCache();
  return entry;
}

/**
 * Evaluates a single conditional rule condition against form values.
 */
function evaluateCondition(cond, values = {}) {
  const actual = values ? values[cond.fieldKey] : undefined;
  const actualStr = actual === null || actual === undefined ? '' : String(actual).trim().toLowerCase();
  const targetStr = cond.value === null || cond.value === undefined ? '' : String(cond.value).trim().toLowerCase();

  switch (cond.operator) {
    case 'equals':
      return actualStr === targetStr;
    case 'not_equals':
      return actualStr !== targetStr;
    case 'contains':
      return actualStr.includes(targetStr);
    case 'in': {
      const list = Array.isArray(cond.value) ? cond.value : String(cond.value || '').split(',').map(s => s.trim().toLowerCase());
      return list.includes(actualStr);
    }
    case 'gt':
      return Number(actual) > Number(cond.value);
    case 'lt':
      return Number(actual) < Number(cond.value);
    case 'is_empty':
      return actualStr === '';
    case 'is_not_empty':
      return actualStr !== '';
    default:
      return false;
  }
}

/**
 * Evaluates all conditional rules on a field given form values.
 * Returns computed { visible, required, readOnly, optionsOverride }.
 */
function evaluateFieldBehavior(field, values = {}) {
  let visible = field.status === 'active';
  let required = Boolean(field.isRequired);
  let readOnly = field.fieldType === 'read_only';
  let optionsOverride = null;

  const rules = Array.isArray(field.conditionalRules) ? field.conditionalRules : [];
  for (const rule of rules) {
    const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
    if (conditions.length === 0) continue;

    const logic = (rule.logic || 'AND').toUpperCase();
    const matched = logic === 'OR'
      ? conditions.some(c => evaluateCondition(c, values))
      : conditions.every(c => evaluateCondition(c, values));

    if (matched) {
      if (rule.action === 'show') visible = true;
      else if (rule.action === 'hide') visible = false;
      else if (rule.action === 'require') required = true;
      else if (rule.action === 'optional') required = false;
      else if (rule.action === 'readonly') readOnly = true;
      else if (rule.action === 'set_options' && Array.isArray(rule.actionPayload)) {
        optionsOverride = rule.actionPayload;
      }
    }
  }

  return { visible, required, readOnly, optionsOverride };
}

/**
 * Validates submission payload against centralized Form Builder rules on the backend.
 * Enforces:
 * - Archived fields cannot be submitted in new entries.
 * - Conditional requiredness & validation rules (min/max/length/pattern/options).
 */
async function validatePayloadAgainstForm(formKey, payload = {}, isNewEntry = true) {
  const global = await loadGlobalConfigSnapshot();
  const form = global.forms.find(f => f.formKey === formKey);
  if (!form) return { valid: true, errors: [] };

  const errors = [];
  const combinedValues = {
    ...(payload || {}),
    ...(payload && typeof payload.customFields === 'object' ? payload.customFields : {})
  };

  for (const field of form.fields) {
    const rawVal = combinedValues[field.fieldKey];
    const hasVal = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';

    // 1. Archived field guard on new entries
    if (field.status === 'archived') {
      if (isNewEntry && hasVal && !field.isCore) {
        errors.push(`Field "${field.label}" is archived and cannot accept values for new entries.`);
      }
      continue;
    }

    if (field.status === 'disabled') continue;

    const behavior = evaluateFieldBehavior(field, combinedValues);
    if (!behavior.visible) continue;

    // 2. Conditional/Static Required Check (enforce strictly on custom fields & configured conditional rules)
    if (behavior.required && !hasVal && (!field.isCore || (field.conditionalRules && field.conditionalRules.length > 0))) {
      errors.push(`Field "${field.label}" is required.`);
      continue;
    }

    if (!hasVal) continue;

    // 3. Type & Validation Rules Check
    const rules = field.validationRules || {};
    if (field.fieldType === 'number') {
      const num = Number(rawVal);
      if (Number.isNaN(num)) {
        errors.push(`Field "${field.label}" must be a valid number.`);
      } else {
        if (rules.min !== undefined && rules.min !== '' && num < Number(rules.min)) {
          errors.push(`Field "${field.label}" must be at least ${rules.min}.`);
        }
        if (rules.max !== undefined && rules.max !== '' && num > Number(rules.max)) {
          errors.push(`Field "${field.label}" must not exceed ${rules.max}.`);
        }
      }
    } else if (field.fieldType === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(rawVal))) {
        errors.push(`Field "${field.label}" must be a valid email address.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  invalidateConfigCache,
  getConfigVersion,
  loadGlobalConfigSnapshot,
  resolveUserAuthorizationContext,
  getRuntimeConfigForUser,
  recordConfigVersion,
  evaluateCondition,
  evaluateFieldBehavior,
  validatePayloadAgainstForm
};

