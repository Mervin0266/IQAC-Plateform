'use strict';

const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const models = require('../models');
const {
  User,
  Role,
  Campus,
  School,
  Department,
  Course,
  ProgramLevel,
  ModuleConfig,
  SystemConfiguration,
  ConfigurationVersion,
  ConfigurationBackup,
  FormDefinition,
  FormField,
  AuditLog
} = models;
const { logActionSafe } = require('../middleware/auditLogger');
const {
  loadGlobalConfigSnapshot,
  invalidateConfigCache,
  recordConfigVersion
} = require('../services/configPropagationService');

const newCorrelationId = () => `ADM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

// ──────────────────────────────────────────────────────────────────────────────
// 1. ADMIN OVERVIEW
// ──────────────────────────────────────────────────────────────────────────────
exports.getAdminOverview = async (req, res) => {
  try {
    await loadGlobalConfigSnapshot();

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalRoles,
      totalCampuses,
      totalSchools,
      totalDepartments,
      totalPrograms,
      modules,
      recentVersions,
      recentAudits
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { isActive: false } }),
      Role.count({ where: { isActive: true } }),
      Campus.count(),
      School.count(),
      Department.count(),
      Course.count(),
      ModuleConfig.findAll({ order: [['moduleName', 'ASC']], raw: true }),
      ConfigurationVersion.findAll({ order: [['createdAt', 'DESC']], limit: 8, raw: true }),
      AuditLog.findAll({ order: [['createdAt', 'DESC']], limit: 10, raw: true })
    ]);

    const activeModules = modules.filter(m => m.isEnabled).length;

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers
        },
        rolesCount: totalRoles,
        structure: {
          campuses: totalCampuses,
          schools: totalSchools,
          departments: totalDepartments,
          programs: totalPrograms
        },
        modules: {
          total: modules.length,
          active: activeModules,
          disabled: modules.length - activeModules
        },
        recentConfigurations: recentVersions,
        recentActivities: recentAudits
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to load administration overview.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 2. SYSTEM CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────
exports.getConfigurations = async (req, res) => {
  try {
    await loadGlobalConfigSnapshot();
    const configs = await SystemConfiguration.findAll({
      order: [['category', 'ASC'], ['label', 'ASC']],
      raw: true
    });
    const versions = await ConfigurationVersion.findAll({
      where: { entityType: 'system_configuration' },
      order: [['createdAt', 'DESC']],
      limit: 30,
      raw: true
    });
    res.json({ success: true, data: { configurations: configs, versions } });
  } catch (error) {
    console.error('Get configurations error:', error);
    res.status(500).json({ success: false, message: 'Failed to load system configurations.' });
  }
};

exports.previewConfigurationUpdate = async (req, res) => {
  try {
    const { configKey } = req.params;
    const { value } = req.body;
    const existing = await SystemConfiguration.findOne({ where: { configKey }, raw: true });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Configuration key not found.' });
    }

    const impactedModulesMap = {
      academic_years: ['Dashboard V2.0', 'Faculty Management', 'Student Details', 'Research Reports', 'Placements'],
      semesters: ['Course Files', 'Departmental Activities'],
      program_durations: ['Student Details', 'Institutional Structure'],
      status_categories: ['Faculty Management', 'Student Details', 'Sponsored Research', 'Approvals'],
      document_categories: ['Sponsored Research', 'Consultancy', 'Patents', 'Document Repository'],
      upload_restrictions: ['All Bulk Uploaders', 'Document & Evidence Uploads'],
      report_settings: ['Research Report Generator', 'Institutional Report Generator'],
      institutional_branding: ['Sidebar', 'Excel/PDF/Word Reports', 'Public Portal']
    };

    res.json({
      success: true,
      data: {
        configKey,
        label: existing.label,
        previousValue: existing.value,
        proposedValue: value,
        affectedModules: impactedModulesMap[configKey] || ['Platform Global Settings'],
        requiresMigration: false,
        reversible: true,
        historicalRecordsChanged: false
      }
    });
  } catch (error) {
    console.error('Preview config error:', error);
    res.status(500).json({ success: false, message: 'Failed to preview configuration update.' });
  }
};

exports.updateConfiguration = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { configKey } = req.params;
    const { value, reason } = req.body;

    if (value === undefined || value === null || typeof value !== 'object') {
      return res.status(400).json({ success: false, message: 'Configuration value object is required.' });
    }

    // Dependency validation for upload_restrictions
    if (configKey === 'upload_restrictions') {
      if (value.maxFileSizeMb !== undefined && (Number(value.maxFileSizeMb) <= 0 || Number(value.maxFileSizeMb) > 100)) {
        return res.status(400).json({ success: false, message: 'maxFileSizeMb must be between 1 and 100 MB.' });
      }
      if (value.allowedExtensions && (!Array.isArray(value.allowedExtensions) || value.allowedExtensions.length === 0)) {
        return res.status(400).json({ success: false, message: 'At least one allowed file extension is required.' });
      }
    }

    const existing = await SystemConfiguration.findOne({ where: { configKey } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Configuration key not found.' });
    }

    const prevValue = existing.value;
    const nextVersion = (existing.version || 1) + 1;

    await sequelize.transaction(async (t) => {
      await existing.update({
        value,
        version: nextVersion,
        updatedBy: req.user.id
      }, { transaction: t });

      await recordConfigVersion({
        configId: `config:${configKey}`,
        entityType: 'system_configuration',
        entityName: existing.label,
        previousConfig: prevValue,
        newConfig: value,
        user: req.user,
        reason: reason || 'System configuration updated',
        transaction: t
      });
    });

    await logActionSafe({
      user: req.user,
      action: 'SYSTEM_CONFIG_UPDATED',
      title: `Updated ${existing.label}`,
      module: 'System Configuration',
      entity: 'SystemConfiguration',
      affectedRecordId: configKey,
      previousValue: prevValue,
      updatedValue: value,
      reason: reason || 'Updated by System Administrator',
      correlationId,
      ipAddress: req.ip
    });

    res.json({ success: true, data: existing, message: `${existing.label} updated and propagated.` });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update configuration.' });
  }
};

exports.rollbackConfigurationVersion = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { versionId } = req.params;
    const { reason } = req.body;

    const versionRow = await ConfigurationVersion.findByPk(versionId);
    if (!versionRow) {
      return res.status(404).json({ success: false, message: 'Configuration version not found.' });
    }
    if (!versionRow.previousConfig) {
      return res.status(400).json({ success: false, message: 'No previous configuration snapshot available for rollback.' });
    }

    if (versionRow.entityType === 'system_configuration') {
      const configKey = versionRow.configId.replace(/^config:/, '');
      const config = await SystemConfiguration.findOne({ where: { configKey } });
      if (!config) {
        return res.status(404).json({ success: false, message: 'Target configuration no longer exists.' });
      }
      const beforeRollback = config.value;

      await sequelize.transaction(async (t) => {
        await config.update({
          value: versionRow.previousConfig,
          version: (config.version || 1) + 1,
          updatedBy: req.user.id
        }, { transaction: t });

        await versionRow.update({ changeStatus: 'reverted' }, { transaction: t });

        await recordConfigVersion({
          configId: versionRow.configId,
          entityType: 'system_configuration',
          entityName: `${config.label} (Rollback to v${versionRow.versionNumber})`,
          previousConfig: beforeRollback,
          newConfig: versionRow.previousConfig,
          user: req.user,
          reason: reason || `Rollback of version ${versionRow.versionNumber}`,
          transaction: t
        });
      });

      await logActionSafe({
        user: req.user,
        action: 'CONFIGURATION_ROLLBACK',
        title: `Rolled back ${config.label}`,
        module: 'Data & Configuration',
        entity: 'ConfigurationVersion',
        affectedRecordId: versionRow.id,
        previousValue: beforeRollback,
        updatedValue: versionRow.previousConfig,
        reason: reason || 'Administrator rollback',
        correlationId,
        ipAddress: req.ip
      });

      return res.json({ success: true, data: config, message: 'Configuration restored to previous version.' });
    }

    return res.status(400).json({
      success: false,
      message: `Automated rollback for entity type '${versionRow.entityType}' must be performed via Configuration Backup Restore or Entity Editor.`
    });
  } catch (error) {
    console.error('Rollback error:', error);
    res.status(500).json({ success: false, message: 'Failed to rollback configuration version.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 3. MODULE MANAGEMENT
// ──────────────────────────────────────────────────────────────────────────────
exports.getModules = async (req, res) => {
  try {
    await loadGlobalConfigSnapshot();
    const modules = await ModuleConfig.findAll({ order: [['moduleName', 'ASC']], raw: true });

    const tableModelMap = {
      users: User,
      faculties: models.Faculty,
      students: models.Student,
      departments: Department,
      departmental_activities: models.DepartmentalActivity,
      publications: models.Publication,
      patents: models.Patent,
      copyrights: models.Copyright,
      sponsored_projects: models.SponsoredProject,
      consultancy_projects: models.ConsultancyProject,
      placements: models.Placement,
      achievements: models.Achievement,
      accreditation_parameters: models.AccreditationParameter,
      strategic_plans: models.StrategicPlan
    };

    const enriched = await Promise.all(modules.map(async (m) => {
      let recordCount = 0;
      const targetModel = m.tableNameRef ? tableModelMap[m.tableNameRef] : null;
      if (targetModel) {
        recordCount = await targetModel.count().catch(() => 0);
      }
      return { ...m, recordCount };
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ success: false, message: 'Failed to load modules.' });
  }
};

exports.previewModuleToggle = async (req, res) => {
  try {
    const { moduleKey } = req.params;
    const mod = await ModuleConfig.findOne({ where: { moduleKey }, raw: true });
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    const allModules = await ModuleConfig.findAll({ raw: true });
    const dependentModules = allModules.filter(
      other => Array.isArray(other.dependencies) && other.dependencies.includes(moduleKey)
    );

    res.json({
      success: true,
      data: {
        moduleKey: mod.moduleKey,
        moduleName: mod.moduleName,
        currentStatus: mod.isEnabled ? 'Enabled' : 'Disabled',
        proposedStatus: mod.isEnabled ? 'Disabled' : 'Enabled',
        isCritical: mod.isCritical,
        affectedRoutes: mod.affectedRoutes || [],
        dependentModules: dependentModules.map(d => ({ moduleKey: d.moduleKey, moduleName: d.moduleName })),
        dataPreserved: true,
        tablesPreserved: true,
        warning: mod.isCritical
          ? 'Critical platform modules (Dashboard, System Administration, Authentication) cannot be disabled.'
          : (mod.isEnabled
            ? 'Disabling hides operational access and blocks new submissions while preserving all historical data, uploaded documents, and audit logs.'
            : 'Re-enabling restores operational navigation and workflows immediately.')
      }
    });
  } catch (error) {
    console.error('Preview module toggle error:', error);
    res.status(500).json({ success: false, message: 'Failed to preview module status change.' });
  }
};

exports.toggleModule = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { moduleKey } = req.params;
    const { isEnabled, confirmed, reason } = req.body;

    const mod = await ModuleConfig.findOne({ where: { moduleKey } });
    if (!mod) {
      return res.status(404).json({ success: false, message: 'Module not found.' });
    }

    if (mod.isCritical && isEnabled === false) {
      return res.status(400).json({
        success: false,
        message: `Security Guard: Critical module '${mod.moduleName}' cannot be disabled.`
      });
    }

    if (isEnabled === false && !confirmed) {
      return res.status(400).json({
        success: false,
        message: 'Explicit confirmation is required before disabling an IQAC module.'
      });
    }

    const prevState = { isEnabled: mod.isEnabled };
    const nextEnabled = isEnabled !== undefined ? Boolean(isEnabled) : !mod.isEnabled;

    await sequelize.transaction(async (t) => {
      await mod.update({
        isEnabled: nextEnabled,
        version: (mod.version || 1) + 1,
        lastChangedAt: new Date(),
        lastChangedBy: req.user.id
      }, { transaction: t });

      await recordConfigVersion({
        configId: `module:${moduleKey}`,
        entityType: 'module_config',
        entityName: mod.moduleName,
        previousConfig: prevState,
        newConfig: { isEnabled: nextEnabled },
        user: req.user,
        reason: reason || (nextEnabled ? 'Module enabled' : 'Module disabled'),
        transaction: t
      });
    });

    await logActionSafe({
      user: req.user,
      action: nextEnabled ? 'MODULE_ENABLED' : 'MODULE_DISABLED',
      title: `${mod.moduleName} ${nextEnabled ? 'Enabled' : 'Disabled'}`,
      module: 'Module Management',
      entity: 'ModuleConfig',
      affectedRecordId: moduleKey,
      previousValue: prevState,
      updatedValue: { isEnabled: nextEnabled },
      reason: reason || null,
      correlationId,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: mod,
      message: `${mod.moduleName} is now ${nextEnabled ? 'enabled' : 'disabled'}. All historical records remain preserved.`
    });
  } catch (error) {
    console.error('Toggle module error:', error);
    res.status(500).json({ success: false, message: 'Failed to update module state.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 4. CONFIGURATION BACKUPS & RESTORE (Config-Only, Never Overwrites Operational Data)
// ──────────────────────────────────────────────────────────────────────────────
exports.getBackupsAndVersions = async (req, res) => {
  try {
    const [backups, versions] = await Promise.all([
      ConfigurationBackup.findAll({
        attributes: ['id', 'name', 'description', 'schemaVersion', 'createdBy', 'createdByName', 'createdAt'],
        order: [['createdAt', 'DESC']],
        raw: true
      }),
      ConfigurationVersion.findAll({
        order: [['createdAt', 'DESC']],
        limit: 50,
        raw: true
      })
    ]);
    res.json({ success: true, data: { backups, versions } });
  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve configuration backups and versions.' });
  }
};

async function buildConfigSnapshot() {
  const [roles, forms, fields, campuses, schools, departments, programLevels, courses, systemConfigurations, moduleConfigs] = await Promise.all([
    Role.findAll({ raw: true }),
    FormDefinition.findAll({ raw: true }),
    FormField.findAll({ raw: true }),
    Campus.findAll({ raw: true }),
    School.findAll({ raw: true }),
    Department.findAll({ raw: true }),
    ProgramLevel.findAll({ raw: true }),
    Course.findAll({ raw: true }),
    SystemConfiguration.findAll({ raw: true }),
    ModuleConfig.findAll({ raw: true })
  ]);

  return {
    schemaVersion: '2.0',
    exportedAt: new Date().toISOString(),
    roles,
    formDefinitions: forms,
    formFields: fields,
    institutionalStructure: { campuses, schools, departments, programLevels, courses },
    systemConfigurations,
    moduleConfigs
  };
}

exports.createConfigurationBackup = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { name, description } = req.body;
    const backupName = (name && String(name).trim()) || `IQAC Config Backup (${new Date().toISOString().split('T')[0]})`;
    const snapshot = await buildConfigSnapshot();

    const backup = await ConfigurationBackup.create({
      name: backupName,
      description: description || 'Administrative configuration snapshot (roles, forms, fields, structure, settings, modules).',
      schemaVersion: '2.0',
      snapshot,
      createdBy: req.user.id,
      createdByName: `${req.user.name} (${req.user.email})`
    });

    await logActionSafe({
      user: req.user,
      action: 'CONFIG_BACKUP_CREATED',
      title: backupName,
      module: 'Data & Configuration',
      entity: 'ConfigurationBackup',
      affectedRecordId: backup.id,
      updatedValue: {
        roles: snapshot.roles.length,
        forms: snapshot.formDefinitions.length,
        fields: snapshot.formFields.length,
        departments: snapshot.institutionalStructure.departments.length,
        settings: snapshot.systemConfigurations.length,
        modules: snapshot.moduleConfigs.length
      },
      correlationId,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: backup });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ success: false, message: 'Failed to create configuration backup.' });
  }
};

exports.downloadConfigurationBackup = async (req, res) => {
  try {
    const backup = await ConfigurationBackup.findByPk(req.params.id, { raw: true });
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found.' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="iqac-config-backup-${backup.id.slice(0, 8)}.json"`);
    res.send(JSON.stringify(backup.snapshot, null, 2));
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({ success: false, message: 'Failed to download backup.' });
  }
};

exports.previewBackupRestore = async (req, res) => {
  try {
    let snapshot = req.body.snapshot;
    if (req.body.backupId) {
      const b = await ConfigurationBackup.findByPk(req.body.backupId, { raw: true });
      if (!b) return res.status(404).json({ success: false, message: 'Backup not found.' });
      snapshot = b.snapshot;
    }

    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid backup snapshot format.' });
    }

    const requiredKeys = ['roles', 'systemConfigurations', 'moduleConfigs'];
    const missingKeys = requiredKeys.filter(k => !Array.isArray(snapshot[k]));
    if (snapshot.schemaVersion !== '2.0' || missingKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Incompatible backup schema. Missing keys: ${missingKeys.join(', ') || 'schemaVersion'}`
      });
    }

    const current = await buildConfigSnapshot();
    const conflicts = [];

    // Check critical system admin safeguard
    const hasAdminRole = snapshot.roles.some(r => r.code === 'admin' && r.isSystemAdmin && r.isActive !== false);
    if (!hasAdminRole) {
      conflicts.push('Backup lacks an active System Administrator role; restore will preserve current System Administrator role to prevent lockout.');
    }

    res.json({
      success: true,
      data: {
        schemaCompatible: true,
        schemaVersion: snapshot.schemaVersion,
        exportedAt: snapshot.exportedAt,
        summary: {
          roles: { incoming: snapshot.roles.length, current: current.roles.length },
          formDefinitions: { incoming: (snapshot.formDefinitions || []).length, current: current.formDefinitions.length },
          formFields: { incoming: (snapshot.formFields || []).length, current: current.formFields.length },
          systemConfigurations: { incoming: snapshot.systemConfigurations.length, current: current.systemConfigurations.length },
          moduleConfigs: { incoming: snapshot.moduleConfigs.length, current: current.moduleConfigs.length }
        },
        conflicts,
        operationalDataAffected: false,
        auditHistoryPreserved: true
      }
    });
  } catch (error) {
    console.error('Preview restore error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze backup compatibility.' });
  }
};

exports.restoreConfigurationBackup = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { backupId, snapshot: rawSnapshot, confirmed, reason } = req.body;
    if (!confirmed) {
      return res.status(400).json({ success: false, message: 'Explicit confirmation is required before restoring configuration.' });
    }

    let snapshot = rawSnapshot;
    if (backupId) {
      const b = await ConfigurationBackup.findByPk(backupId, { raw: true });
      if (!b) return res.status(404).json({ success: false, message: 'Backup not found.' });
      snapshot = b.snapshot;
    }

    if (!snapshot || snapshot.schemaVersion !== '2.0' || !Array.isArray(snapshot.roles)) {
      return res.status(400).json({ success: false, message: 'Invalid or incompatible configuration backup.' });
    }

    const preRestoreSnapshot = await buildConfigSnapshot();

    await sequelize.transaction(async (t) => {
      // 1. Restore System Configurations
      for (const cfg of snapshot.systemConfigurations || []) {
        await SystemConfiguration.upsert({
          id: cfg.id,
          configKey: cfg.configKey,
          category: cfg.category,
          label: cfg.label,
          description: cfg.description,
          value: cfg.value,
          version: (cfg.version || 1) + 1,
          updatedBy: req.user.id
        }, { transaction: t });
      }

      // 2. Restore Module Configs (ensuring critical modules stay enabled)
      for (const mod of snapshot.moduleConfigs || []) {
        await ModuleConfig.upsert({
          id: mod.id,
          moduleKey: mod.moduleKey,
          moduleName: mod.moduleName,
          description: mod.description,
          routeKey: mod.routeKey,
          tableNameRef: mod.tableNameRef,
          isEnabled: mod.isCritical ? true : Boolean(mod.isEnabled),
          isCritical: Boolean(mod.isCritical),
          dependencies: mod.dependencies || [],
          affectedRoutes: mod.affectedRoutes || [],
          version: (mod.version || 1) + 1,
          lastChangedAt: new Date(),
          lastChangedBy: req.user.id
        }, { transaction: t });
      }

      // 3. Restore Roles (safeguarding active System Admin role)
      for (const role of snapshot.roles || []) {
        const isPrimarySysAdmin = role.code === 'admin';
        await Role.upsert({
          id: role.id,
          code: role.code,
          name: role.name,
          description: role.description,
          isSystem: Boolean(role.isSystem),
          isSystemAdmin: isPrimarySysAdmin ? true : Boolean(role.isSystemAdmin),
          isActive: isPrimarySysAdmin ? true : Boolean(role.isActive),
          defaultScope: role.defaultScope || 'department',
          permissions: role.permissions || {},
          updatedBy: req.user.id
        }, { transaction: t });
      }

      // 4. Restore Form Definitions & Fields
      for (const fDef of snapshot.formDefinitions || []) {
        await FormDefinition.upsert({
          id: fDef.id,
          moduleKey: fDef.moduleKey,
          formKey: fDef.formKey,
          formName: fDef.formName,
          description: fDef.description,
          tableNameRef: fDef.tableNameRef,
          isActive: Boolean(fDef.isActive),
          version: (fDef.version || 1) + 1,
          updatedBy: req.user.id
        }, { transaction: t });
      }

      for (const fld of snapshot.formFields || []) {
        await FormField.upsert({
          id: fld.id,
          formId: fld.formId,
          fieldKey: fld.fieldKey,
          label: fld.label,
          description: fld.description,
          fieldType: fld.fieldType,
          isCore: Boolean(fld.isCore),
          isRequired: Boolean(fld.isRequired),
          defaultValue: fld.defaultValue,
          validationRules: fld.validationRules || {},
          options: fld.options || [],
          conditionalRules: fld.conditionalRules || [],
          displayOrder: fld.displayOrder || 0,
          status: fld.status || 'active',
          archivedAt: fld.archivedAt || null,
          archivedBy: fld.archivedBy || null,
          previousTypeHistory: fld.previousTypeHistory || []
        }, { transaction: t });
      }

      await recordConfigVersion({
        configId: `backup_restore:${backupId || 'uploaded'}`,
        entityType: 'backup_restore',
        entityName: 'Configuration Backup Restore',
        previousConfig: { exportedAt: preRestoreSnapshot.exportedAt },
        newConfig: { restoredFrom: snapshot.exportedAt, backupId: backupId || 'json-upload' },
        user: req.user,
        reason: reason || 'Configuration restored from backup',
        transaction: t
      });
    });

    await logActionSafe({
      user: req.user,
      action: 'CONFIG_BACKUP_RESTORED',
      title: 'Configuration Backup Restored',
      module: 'Data & Configuration',
      entity: 'ConfigurationBackup',
      affectedRecordId: backupId || 'uploaded',
      reason: reason || 'Explicitly confirmed restore',
      correlationId,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Administrative configuration restored safely. All operational IQAC records and audit history remain untouched.'
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to restore configuration backup.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 5. AUDIT LOGS V2.0 (Immutable Read-Only Viewer & Safe Export)
// ──────────────────────────────────────────────────────────────────────────────
exports.getAdminAuditLogs = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      admin,
      action,
      module: moduleFilter,
      entity,
      result,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = end;
      }
    }
    if (action && action !== 'all') where.action = { [Op.iLike]: `%${action}%` };
    if (moduleFilter && moduleFilter !== 'all') where.module = { [Op.iLike]: `%${moduleFilter}%` };
    if (entity && entity !== 'all') where.entity = { [Op.iLike]: `%${entity}%` };
    if (result && result !== 'all') where.result = result;
    if (admin && admin !== 'all') {
      where[Op.or] = [
        { userName: { [Op.iLike]: `%${admin}%` } },
        { adminIdentity: { [Op.iLike]: `%${admin}%` } }
      ];
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.and] = [
        {
          [Op.or]: [
            { action: { [Op.iLike]: q } },
            { achievementTitle: { [Op.iLike]: q } },
            { userName: { [Op.iLike]: q } },
            { adminIdentity: { [Op.iLike]: q } },
            { remarks: { [Op.iLike]: q } },
            { correlationId: { [Op.iLike]: q } }
          ]
        }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(200, Math.max(10, parseInt(limit, 10) || 50));

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageLimit,
      offset: (pageNum - 1) * pageLimit,
      raw: true
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: pageLimit,
        totalPages: Math.ceil(count / pageLimit)
      }
    });
  } catch (error) {
    console.error('Get admin audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
};

