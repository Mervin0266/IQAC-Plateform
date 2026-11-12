'use strict';

const express = require('express');
const router = express.Router();
const { auth, requireSystemAdmin } = require('../middleware/auth');

const overviewAuditCtrl = require('../controllers/systemAdminOverviewAuditController');
const usersRolesCtrl = require('../controllers/systemAdminUsersRolesController');
const structureFormsCtrl = require('../controllers/systemAdminStructureFormsController');

// Mandatory Strict Gate: Authenticated System Administrator ONLY
router.use(auth);
router.use(requireSystemAdmin);

// 1. Overview
router.get('/overview', overviewAuditCtrl.getAdminOverview);

// 2. User Management V2.0
router.get('/users/bulk-template', usersRolesCtrl.downloadUserBulkTemplate);
router.post('/users/bulk-preview', usersRolesCtrl.previewUserBulkUpload);
router.post('/users/bulk-import', usersRolesCtrl.importUsersBulk);
router.get('/users', usersRolesCtrl.listUsers);
router.post('/users', usersRolesCtrl.createUser);
router.get('/users/:id', usersRolesCtrl.getUserDetails);
router.put('/users/:id', usersRolesCtrl.updateUser);
router.post('/users/:id/deactivate', usersRolesCtrl.deactivateUser);
router.post('/users/:id/activate', usersRolesCtrl.activateUser);
router.post('/users/:id/reset-password', usersRolesCtrl.resetUserPassword);
router.post('/users/:id/revoke-sessions', usersRolesCtrl.revokeUserSessions);
router.put('/users/:id/permissions', usersRolesCtrl.updateUserPermissionOverrides);

// 3. Roles & Permissions
router.get('/roles', usersRolesCtrl.listRoles);
router.post('/roles', usersRolesCtrl.createRole);
router.put('/roles/:id', usersRolesCtrl.updateRole);
router.post('/roles/:id/deactivate', usersRolesCtrl.deactivateRole);
router.post('/roles/:id/activate', usersRolesCtrl.activateRole);

// 4. Form Builder V2.0
router.get('/forms', structureFormsCtrl.listForms);
router.get('/forms/:formId', structureFormsCtrl.getFormDetails);
router.post('/forms/:formId/fields', structureFormsCtrl.addFormField);
router.post('/forms/:formId/fields/reorder', structureFormsCtrl.reorderFormFields);
router.put('/forms/:formId/fields/:fieldId', structureFormsCtrl.updateFormField);
router.post('/forms/:formId/fields/:fieldId/compatibility-check', structureFormsCtrl.checkFieldTypeCompatibility);
router.post('/forms/:formId/fields/:fieldId/status', structureFormsCtrl.updateFormFieldStatus);

// 5. Institutional Structure V2.0
router.get('/structure', structureFormsCtrl.getStructureOverview);
router.post('/structure/preview', structureFormsCtrl.previewStructureImpact);
router.post('/structure/department/merge', structureFormsCtrl.mergeDepartments);
router.post('/structure/:entityType', structureFormsCtrl.createStructureEntity);
router.put('/structure/:entityType/:id', structureFormsCtrl.updateStructureEntity);
router.post('/structure/:entityType/:id/status', structureFormsCtrl.toggleStructureEntityStatus);

// 6. System Configuration & Versioning
router.get('/configurations', overviewAuditCtrl.getConfigurations);
router.post('/configurations/:configKey/preview', overviewAuditCtrl.previewConfigurationUpdate);
router.put('/configurations/:configKey', overviewAuditCtrl.updateConfiguration);
router.post('/configurations/versions/:versionId/rollback', overviewAuditCtrl.rollbackConfigurationVersion);

// 7. Module Management
router.get('/modules', overviewAuditCtrl.getModules);
router.post('/modules/:moduleKey/preview', overviewAuditCtrl.previewModuleToggle);
router.put('/modules/:moduleKey/toggle', overviewAuditCtrl.toggleModule);

// 8. Data & Configuration Backup / Restore
router.get('/backups', overviewAuditCtrl.getBackupsAndVersions);
router.post('/backups', overviewAuditCtrl.createConfigurationBackup);
router.get('/backups/:id/download', overviewAuditCtrl.downloadConfigurationBackup);
router.post('/backups/preview-restore', overviewAuditCtrl.previewBackupRestore);
router.post('/backups/restore', overviewAuditCtrl.restoreConfigurationBackup);

// 9. Audit Logs V2.0 (Immutable Read-Only)
router.get('/audit-logs', overviewAuditCtrl.getAdminAuditLogs);

module.exports = router;

