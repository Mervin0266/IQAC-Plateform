'use strict';

const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const models = require('../models');
const {
  Campus,
  School,
  Department,
  ProgramLevel,
  Course,
  DepartmentLineage,
  User,
  UserOrganizationalScope,
  FormDefinition,
  FormField,
  SystemConfiguration
} = models;
const { logActionSafe } = require('../middleware/auditLogger');
const {
  loadGlobalConfigSnapshot,
  recordConfigVersion,
  invalidateConfigCache
} = require('../services/configPropagationService');

const newCorrelationId = () => `ADM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

// Tables tracking department string associations & their AY column names
const DEPT_ASSOCIATED_TABLES = [
  { key: 'users', label: 'Registered Users', model: models.User, col: 'department', ayCol: null },
  { key: 'faculty', label: 'Faculty Records', model: models.Faculty, col: 'department', ayCol: 'academicYear' },
  { key: 'students', label: 'Student Records', model: models.Student, col: 'department', ayCol: 'academicYear' },
  { key: 'publications', label: 'Publications', model: models.Publication, col: 'department', ayCol: 'academicYear' },
  { key: 'patents', label: 'Patents & IP', model: models.Patent, col: 'department', ayCol: 'academicYear' },
  { key: 'sponsored', label: 'Sponsored Research', model: models.SponsoredProject, col: 'department', ayCol: 'academicYear' },
  { key: 'consultancy', label: 'Consultancy Projects', model: models.ConsultancyProject, col: 'department', ayCol: 'year' },
  { key: 'placements', label: 'Placements & Internships', model: models.Placement, col: 'department', ayCol: 'batch' },
  { key: 'achievements', label: 'Achievements', model: models.Achievement, col: 'department', ayCol: 'academicYear' },
  { key: 'activities', label: 'Departmental Activities', model: models.DepartmentalActivity, col: 'department', ayCol: 'academicYear' },
  { key: 'strategicPlans', label: 'Strategic Plans', model: models.StrategicPlan, col: 'department', ayCol: 'academicYear' }
];

async function getCurrentActiveAcademicYearVariants() {
  let defaultAy = '2026-2027';
  try {
    const cfg = await SystemConfiguration.findOne({ where: { configKey: 'academic_years' }, raw: true });
    if (cfg && cfg.value && cfg.value.defaultAcademicYear) {
      defaultAy = cfg.value.defaultAcademicYear;
    }
  } catch (e) {}

  const m = String(defaultAy).match(/(\d{4})/);
  const startYr = m ? parseInt(m[1], 10) : 2026;
  const endYr2 = String((startYr + 1) % 100).padStart(2, '0');
  const endYr4 = String(startYr + 1);

  return [
    defaultAy,
    `${startYr}-${endYr2}`,
    `${startYr}–${endYr2}`,
    `${startYr}-${endYr4}`,
    `AY ${startYr}-${endYr2}`,
    `AY ${startYr}–${endYr2}`,
    `AY ${startYr}-${endYr4}`,
    String(startYr)
  ];
}

async function computeDepartmentImpactCounts(deptNames = []) {
  const cleanNames = deptNames.filter(Boolean);
  if (cleanNames.length === 0) return { total: 0, currentYearTotal: 0, breakdown: {} };

  const currentAyVariants = await getCurrentActiveAcademicYearVariants();
  const breakdown = {};
  let total = 0;
  let currentYearTotal = 0;

  for (const t of DEPT_ASSOCIATED_TABLES) {
    if (!t.model) {
      breakdown[t.key] = { label: t.label, total: 0, currentYear: 0 };
      continue;
    }
    try {
      const allCount = await t.model.count({ where: { [t.col]: { [Op.in]: cleanNames } } });
      let currentCount = allCount;
      if (t.ayCol) {
        currentCount = await t.model.count({
          where: {
            [t.col]: { [Op.in]: cleanNames },
            [t.ayCol]: { [Op.in]: currentAyVariants }
          }
        });
      }
      breakdown[t.key] = { label: t.label, total: allCount, currentYear: currentCount };
      total += allCount;
      currentYearTotal += currentCount;
    } catch (e) {
      breakdown[t.key] = { label: t.label, total: 0, currentYear: 0 };
    }
  }

  return { total, currentYearTotal, currentAyVariants, breakdown };
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. INSTITUTIONAL STRUCTURE V2.0
// ──────────────────────────────────────────────────────────────────────────────
exports.getStructureOverview = async (req, res) => {
  try {
    await loadGlobalConfigSnapshot();
    const [campuses, schools, departments, programLevels, courses, lineages] = await Promise.all([
      Campus.findAll({ order: [['name', 'ASC']], raw: true }),
      School.findAll({ order: [['name', 'ASC']], raw: true }),
      Department.findAll({ order: [['code', 'ASC'], ['name', 'ASC']], raw: true }),
      ProgramLevel.findAll({ order: [['name', 'ASC']], raw: true }),
      Course.findAll({ order: [['name', 'ASC']], raw: true }),
      DepartmentLineage.findAll({ order: [['splitDate', 'DESC']], raw: true }).catch(() => [])
    ]);

    res.json({
      success: true,
      data: {
        campuses,
        schools,
        departments,
        programLevels,
        courses,
        lineages
      }
    });
  } catch (error) {
    console.error('Get structure overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to load institutional structure.' });
  }
};

exports.previewStructureImpact = async (req, res) => {
  try {
    const { entityType, id, operation, newName, targetParentId, mergeTargetId } = req.body;
    let entityName = '';
    let impactNames = [];

    if (entityType === 'department') {
      const dept = await Department.findByPk(id, { raw: true });
      if (!dept) return res.status(404).json({ success: false, message: 'Department not found.' });
      entityName = dept.name;
      impactNames = [dept.name, dept.shortName].filter(Boolean);
    } else if (entityType === 'school') {
      const school = await School.findByPk(id, { raw: true });
      if (!school) return res.status(404).json({ success: false, message: 'School not found.' });
      entityName = school.name;
      const childDepts = await Department.findAll({ where: { schoolId: id }, attributes: ['name', 'shortName'], raw: true });
      childDepts.forEach(d => {
        impactNames.push(d.name);
        if (d.shortName) impactNames.push(d.shortName);
      });
    } else if (entityType === 'campus') {
      const campus = await Campus.findByPk(id, { raw: true });
      if (!campus) return res.status(404).json({ success: false, message: 'Campus not found.' });
      entityName = campus.name;
      const childSchools = await School.findAll({ where: { campusId: id }, attributes: ['id'], raw: true });
      const schoolIds = childSchools.map(s => s.id);
      const childDepts = schoolIds.length > 0
        ? await Department.findAll({ where: { schoolId: { [Op.in]: schoolIds } }, attributes: ['name', 'shortName'], raw: true })
        : [];
      childDepts.forEach(d => {
        impactNames.push(d.name);
        if (d.shortName) impactNames.push(d.shortName);
      });
    } else if (entityType === 'course') {
      const course = await Course.findByPk(id, { raw: true });
      if (!course) return res.status(404).json({ success: false, message: 'Program/Course not found.' });
      entityName = course.name;
    }

    const counts = await computeDepartmentImpactCounts(impactNames);

    let mergeTargetName = null;
    if (operation === 'merge' && mergeTargetId && entityType === 'department') {
      const target = await Department.findByPk(mergeTargetId, { raw: true });
      mergeTargetName = target ? target.name : null;
    }

    res.json({
      success: true,
      data: {
        entityType,
        entityId: id,
        entityName,
        newName: newName || entityName,
        mergeTargetName,
        operation,
        targetParentId: targetParentId || null,
        totalAffectedRecords: counts.total,
        currentAcademicYearRecords: counts.currentYearTotal,
        historicalRecordsCount: Math.max(0, counts.total - counts.currentYearTotal),
        breakdown: counts.breakdown,
        affectedComponents: [
          'Dashboard V2.0 Filters & KPI Aggregations',
          'Institutional & Research Report Generators (Excel/PDF/Word)',
          'Student & Faculty Bulk Upload Validation',
          'User Organizational Access Scopes & Form Dropdowns'
        ],
        options: {
          A: {
            title: 'OPTION A — Update Everywhere',
            description: `Updates "${entityName}" to "${newName || mergeTargetName || entityName}" across the structural catalog AND propagates the name change to all ${counts.total} current and historical records.`
          },
          B: {
            title: 'OPTION B — Update Current Records Only',
            description: `Updates "${entityName}" in the active directory and ${counts.currentYearTotal} current academic year records while preserving historical academic-year names on ${Math.max(0, counts.total - counts.currentYearTotal)} past records.`
          }
        }
      }
    });
  } catch (error) {
    console.error('Preview structure impact error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze structural impact.' });
  }
};

exports.createStructureEntity = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { entityType } = req.params;
    const payload = req.body;
    let created = null;

    if (entityType === 'campus') {
      created = await Campus.create({
        code: payload.code,
        name: payload.name,
        description: payload.description || null,
        status: 'Active'
      });
    } else if (entityType === 'school') {
      created = await School.create({
        code: payload.code,
        name: payload.name,
        description: payload.description || null,
        campusId: payload.campusId,
        status: 'Active'
      });
    } else if (entityType === 'department') {
      created = await Department.create({
        code: payload.code,
        name: payload.name,
        shortName: payload.shortName || payload.code,
        schoolId: payload.schoolId || null,
        establishedYear: payload.establishedYear || null,
        hodName: payload.hodName || null,
        hodEmail: payload.hodEmail || null,
        description: payload.description || null,
        status: 'Active'
      });
    } else if (entityType === 'course') {
      created = await Course.create({
        code: payload.code,
        name: payload.name,
        description: payload.description || null,
        departmentId: payload.departmentId,
        programLevelId: payload.programLevelId,
        duration: payload.duration || null,
        status: 'Active'
      });
    } else if (entityType === 'programLevel') {
      created = await ProgramLevel.create({
        code: payload.code,
        name: payload.name,
        description: payload.description || null,
        status: 'Active'
      });
    } else {
      return res.status(400).json({ success: false, message: `Unsupported entityType '${entityType}'.` });
    }

    await recordConfigVersion({
      configId: `structure:${entityType}:${created.id}`,
      entityType: 'institutional_structure',
      entityName: `Created ${entityType}: ${created.name}`,
      previousConfig: null,
      newConfig: created.toJSON(),
      user: req.user,
      reason: payload.reason || `Added ${entityType}`
    });

    await logActionSafe({
      user: req.user,
      action: `STRUCTURE_${entityType.toUpperCase()}_CREATED`,
      title: `Created ${entityType}: ${created.name}`,
      module: 'Institutional Structure',
      entity: entityType,
      affectedRecordId: created.id,
      updatedValue: created.toJSON(),
      correlationId,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Create structure entity error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create institutional entity.' });
  }
};

exports.updateStructureEntity = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { entityType, id } = req.params;
    const {
      name,
      code,
      shortName,
      description,
      campusId,
      schoolId,
      departmentId,
      programLevelId,
      duration,
      establishedYear,
      hodName,
      hodEmail,
      propagationMode, // Mandatory explicit 'A' or 'B' when renaming!
      reason
    } = req.body;

    let entity = null;
    if (entityType === 'campus') entity = await Campus.findByPk(id);
    else if (entityType === 'school') entity = await School.findByPk(id);
    else if (entityType === 'department') entity = await Department.findByPk(id);
    else if (entityType === 'course') entity = await Course.findByPk(id);
    else if (entityType === 'programLevel') entity = await ProgramLevel.findByPk(id);

    if (!entity) {
      return res.status(404).json({ success: false, message: `${entityType} not found.` });
    }

    const oldName = entity.name;
    const isRenaming = name && String(name).trim() !== oldName;

    // Enforce explicit Option A or Option B whenever renaming departments/schools/campuses
    if (isRenaming && ['department', 'school', 'campus'].includes(entityType)) {
      if (!['A', 'B'].includes(propagationMode)) {
        return res.status(400).json({
          success: false,
          code: 'PROPAGATION_MODE_REQUIRED',
          message: 'Renaming an institutional entity requires explicit selection of Option A (Update Everywhere) or Option B (Update Current Records Only).'
        });
      }
    }

    const prevSnapshot = entity.toJSON();
    const currentAyVariants = await getCurrentActiveAcademicYearVariants();

    await sequelize.transaction(async (t) => {
      const updates = {};
      if (name !== undefined) updates.name = String(name).trim();
      if (code !== undefined) updates.code = String(code).trim();
      if (description !== undefined) updates.description = description;
      if (entityType === 'school' && campusId) updates.campusId = campusId;
      if (entityType === 'department') {
        if (shortName !== undefined) updates.shortName = shortName;
        if (schoolId !== undefined) updates.schoolId = schoolId;
        if (establishedYear !== undefined) updates.establishedYear = establishedYear;
        if (hodName !== undefined) updates.hodName = hodName;
        if (hodEmail !== undefined) updates.hodEmail = hodEmail;
      }
      if (entityType === 'course') {
        if (departmentId) updates.departmentId = departmentId;
        if (programLevelId) updates.programLevelId = programLevelId;
        if (duration !== undefined) updates.duration = duration;
      }

      await entity.update(updates, { transaction: t });

      // Propagate renames according to explicit Option A vs Option B
      if (isRenaming && entityType === 'department') {
        const cleanNewName = updates.name;
        if (propagationMode === 'A') {
          // Option A: Update Everywhere (current + historical records + user scopes)
          for (const tbl of DEPT_ASSOCIATED_TABLES) {
            if (!tbl.model) continue;
            await tbl.model.update(
              { [tbl.col]: cleanNewName },
              { where: { [tbl.col]: oldName }, transaction: t }
            );
          }
          await UserOrganizationalScope.update(
            { departmentName: cleanNewName },
            { where: { departmentName: oldName }, transaction: t }
          );
        } else if (propagationMode === 'B') {
          // Option B: Update Current Records Only + preserve historical AY records + record lineage
          await User.update(
            { department: cleanNewName },
            { where: { department: oldName }, transaction: t }
          );
          await UserOrganizationalScope.update(
            { departmentName: cleanNewName },
            { where: { departmentName: oldName }, transaction: t }
          );
          for (const tbl of DEPT_ASSOCIATED_TABLES) {
            if (!tbl.model || !tbl.ayCol) continue;
            await tbl.model.update(
              { [tbl.col]: cleanNewName },
              {
                where: {
                  [tbl.col]: oldName,
                  [tbl.ayCol]: { [Op.in]: currentAyVariants }
                },
                transaction: t
              }
            );
          }
          // Preserve lineage bridge so analytics & reports recognize historical name -> new name
          await DepartmentLineage.create({
            domainGroup: 'Institutional Rename (Option B)',
            parentDepartment: oldName,
            childDepartment: cleanNewName,
            splitAcademicYear: currentAyVariants[0] || '2026-27',
            splitDate: new Date().toISOString().split('T')[0],
            status: 'Active',
            description: reason || `Renamed '${oldName}' to '${cleanNewName}' with historical records preserved.`
          }, { transaction: t });
        }
      } else if (isRenaming && entityType === 'campus') {
        if (propagationMode === 'A') {
          await User.update({ campus: updates.name }, { where: { campus: oldName }, transaction: t });
          await UserOrganizationalScope.update({ campusName: updates.name }, { where: { campusName: oldName }, transaction: t });
          if (models.Student.rawAttributes.campus) {
            await models.Student.update({ campus: updates.name }, { where: { campus: oldName }, transaction: t });
          }
          if (models.Placement.rawAttributes.campus) {
            await models.Placement.update({ campus: updates.name }, { where: { campus: oldName }, transaction: t });
          }
        } else if (propagationMode === 'B') {
          await User.update({ campus: updates.name }, { where: { campus: oldName }, transaction: t });
          await UserOrganizationalScope.update({ campusName: updates.name }, { where: { campusName: oldName }, transaction: t });
        }
      } else if (isRenaming && entityType === 'school') {
        if (propagationMode === 'A') {
          await User.update({ school: updates.name }, { where: { school: oldName }, transaction: t });
          await UserOrganizationalScope.update({ schoolName: updates.name }, { where: { schoolName: oldName }, transaction: t });
          if (models.Student.rawAttributes.school) {
            await models.Student.update({ school: updates.name }, { where: { school: oldName }, transaction: t });
          }
          if (models.Placement.rawAttributes.school) {
            await models.Placement.update({ school: updates.name }, { where: { school: oldName }, transaction: t });
          }
        } else if (propagationMode === 'B') {
          await User.update({ school: updates.name }, { where: { school: oldName }, transaction: t });
          await UserOrganizationalScope.update({ schoolName: updates.name }, { where: { schoolName: oldName }, transaction: t });
        }
      }

      await recordConfigVersion({
        configId: `structure:${entityType}:${id}`,
        entityType: 'institutional_structure',
        entityName: `Updated ${entityType}: ${updates.name || oldName}`,
        previousConfig: prevSnapshot,
        newConfig: { ...entity.toJSON(), propagationMode: propagationMode || null },
        user: req.user,
        reason: reason || `Updated ${entityType}`,
        transaction: t
      });
    });

    invalidateConfigCache();

    await logActionSafe({
      user: req.user,
      action: isRenaming ? `STRUCTURE_${entityType.toUpperCase()}_RENAMED` : `STRUCTURE_${entityType.toUpperCase()}_UPDATED`,
      title: `Updated ${entityType}: ${entity.name}`,
      module: 'Institutional Structure',
      entity: entityType,
      affectedRecordId: id,
      previousValue: prevSnapshot,
      updatedValue: { ...entity.toJSON(), propagationMode: propagationMode || null },
      reason: reason || null,
      correlationId,
      ipAddress: req.ip
    });

    res.json({ success: true, data: entity, message: `${entityType} updated successfully.` });
  } catch (error) {
    console.error('Update structure entity error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update institutional entity.' });
  }
};

exports.toggleStructureEntityStatus = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { entityType, id } = req.params;
    const { status, confirmed, reason } = req.body;

    let entity = null;
    if (entityType === 'campus') entity = await Campus.findByPk(id);
    else if (entityType === 'school') entity = await School.findByPk(id);
    else if (entityType === 'department') entity = await Department.findByPk(id);
    else if (entityType === 'course') entity = await Course.findByPk(id);
    else if (entityType === 'programLevel') entity = await ProgramLevel.findByPk(id);

    if (!entity) return res.status(404).json({ success: false, message: `${entityType} not found.` });

    const nextStatus = status || (entity.status === 'Active' ? 'Inactive' : 'Active');
    if (nextStatus === 'Inactive' && !confirmed) {
      return res.status(400).json({
        success: false,
        message: 'Explicit confirmation is required before deactivating an institutional entity.'
      });
    }

    const prevStatus = entity.status;
    // Safeguard: NEVER silently delete or reassign users/records when deactivating!
    await entity.update({ status: nextStatus });

    await recordConfigVersion({
      configId: `structure:${entityType}:${id}`,
      entityType: 'institutional_structure',
      entityName: `${nextStatus === 'Inactive' ? 'Deactivated' : 'Restored'} ${entityType}: ${entity.name}`,
      previousConfig: { status: prevStatus },
      newConfig: { status: nextStatus },
      user: req.user,
      reason: reason || `Status changed to ${nextStatus}`
    });

    await logActionSafe({
      user: req.user,
      action: nextStatus === 'Inactive' ? `STRUCTURE_${entityType.toUpperCase()}_DEACTIVATED` : `STRUCTURE_${entityType.toUpperCase()}_RESTORED`,
      title: `${nextStatus === 'Inactive' ? 'Deactivated' : 'Restored'} ${entityType}: ${entity.name}`,
      module: 'Institutional Structure',
      entity: entityType,
      affectedRecordId: id,
      previousValue: { status: prevStatus },
      updatedValue: { status: nextStatus },
      reason: reason || null,
      correlationId,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: entity,
      message: `${entity.name} marked as ${nextStatus}. Existing historical records and user assignments remain intact.`
    });
  } catch (error) {
    console.error('Toggle structure status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update entity status.' });
  }
};

exports.mergeDepartments = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { sourceDeptId, targetDeptId, propagationMode, confirmed, reason } = req.body;
    if (!confirmed || !['A', 'B'].includes(propagationMode)) {
      return res.status(400).json({
        success: false,
        message: 'Merging departments requires explicit confirmation and Option A or B selection.'
      });
    }
    if (sourceDeptId === targetDeptId) {
      return res.status(400).json({ success: false, message: 'Source and target departments must be distinct.' });
    }

    const [source, target] = await Promise.all([
      Department.findByPk(sourceDeptId),
      Department.findByPk(targetDeptId)
    ]);
    if (!source || !target) {
      return res.status(404).json({ success: false, message: 'Source or target department not found.' });
    }

    const currentAyVariants = await getCurrentActiveAcademicYearVariants();

    await sequelize.transaction(async (t) => {
      if (propagationMode === 'A') {
        for (const tbl of DEPT_ASSOCIATED_TABLES) {
          if (!tbl.model) continue;
          await tbl.model.update({ [tbl.col]: target.name }, { where: { [tbl.col]: source.name }, transaction: t });
        }
        await UserOrganizationalScope.update(
          { departmentId: target.id, departmentName: target.name },
          { where: { departmentName: source.name }, transaction: t }
        );
      } else {
        await User.update({ department: target.name }, { where: { department: source.name }, transaction: t });
        await UserOrganizationalScope.update(
          { departmentId: target.id, departmentName: target.name },
          { where: { departmentName: source.name }, transaction: t }
        );
        for (const tbl of DEPT_ASSOCIATED_TABLES) {
          if (!tbl.model || !tbl.ayCol) continue;
          await tbl.model.update(
            { [tbl.col]: target.name },
            { where: { [tbl.col]: source.name, [tbl.ayCol]: { [Op.in]: currentAyVariants } }, transaction: t }
          );
        }
      }

      await Course.update({ departmentId: target.id }, { where: { departmentId: source.id }, transaction: t });
      await source.update({ status: 'Inactive' }, { transaction: t });

      await DepartmentLineage.create({
        domainGroup: 'Departmental Merge',
        parentDepartment: source.name,
        childDepartment: target.name,
        splitAcademicYear: currentAyVariants[0] || '2026-27',
        splitDate: new Date().toISOString().split('T')[0],
        status: 'Historical',
        description: reason || `Merged '${source.name}' into '${target.name}' (Option ${propagationMode})`
      }, { transaction: t });

      await recordConfigVersion({
        configId: `structure:merge:${source.id}->${target.id}`,
        entityType: 'institutional_structure',
        entityName: `Merged ${source.name} into ${target.name}`,
        previousConfig: { source: source.name, target: target.name },
        newConfig: { mergedInto: target.name, propagationMode },
        user: req.user,
        reason: reason || 'Department merge',
        transaction: t
      });
    });

    await logActionSafe({
      user: req.user,
      action: 'STRUCTURE_DEPARTMENT_MERGED',
      title: `Merged ${source.name} into ${target.name}`,
      module: 'Institutional Structure',
      entity: 'Department',
      affectedRecordId: target.id,
      previousValue: { sourceDept: source.name },
      updatedValue: { targetDept: target.name, propagationMode },
      reason: reason || null,
      correlationId,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `'${source.name}' merged into '${target.name}' using Option ${propagationMode}.`
    });
  } catch (error) {
    console.error('Merge departments error:', error);
    res.status(500).json({ success: false, message: 'Failed to merge departments.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 2. ADVANCED FORM BUILDER V2.0
// ──────────────────────────────────────────────────────────────────────────────
exports.listForms = async (req, res) => {
  try {
    await loadGlobalConfigSnapshot();
    const forms = await FormDefinition.findAll({
      include: [{ model: FormField, as: 'fields' }],
      order: [['moduleKey', 'ASC'], ['formName', 'ASC']]
    });

    const formatted = forms.map(f => {
      const plain = f.toJSON();
      plain.fields = (plain.fields || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      return plain;
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('List forms error:', error);
    res.status(500).json({ success: false, message: 'Failed to load form definitions.' });
  }
};

exports.getFormDetails = async (req, res) => {
  try {
    const form = await FormDefinition.findByPk(req.params.formId, {
      include: [{ model: FormField, as: 'fields' }]
    });
    if (!form) return res.status(404).json({ success: false, message: 'Form not found.' });

    const plain = form.toJSON();
    plain.fields = (plain.fields || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    res.json({ success: true, data: plain });
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ success: false, message: 'Failed to load form details.' });
  }
};

exports.addFormField = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { formId } = req.params;
    const form = await FormDefinition.findByPk(formId);
    if (!form) return res.status(404).json({ success: false, message: 'Form not found.' });

    const {
      label,
      fieldKey,
      description,
      fieldType = 'text',
      isRequired = false,
      defaultValue = null,
      validationRules = {},
      options = [],
      conditionalRules = []
    } = req.body;

    if (!label || !String(label).trim()) {
      return res.status(400).json({ success: false, message: 'Field label is required.' });
    }

    const cleanKey = (fieldKey ? String(fieldKey) : String(label))
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const existingField = await FormField.findOne({ where: { formId, fieldKey: cleanKey } });
    if (existingField) {
      return res.status(400).json({ success: false, message: `Field key '${cleanKey}' already exists on this form.` });
    }

    const maxOrder = (await FormField.max('displayOrder', { where: { formId } })) || 0;

    const field = await sequelize.transaction(async (t) => {
      const created = await FormField.create({
        formId,
        fieldKey: cleanKey,
        label: String(label).trim(),
        description: description || null,
        fieldType,
        isCore: false,
        isRequired: Boolean(isRequired),
        defaultValue: defaultValue !== '' ? defaultValue : null,
        validationRules,
        options,
        conditionalRules,
        displayOrder: maxOrder + 1,
        status: 'active'
      }, { transaction: t });

      await form.update({ version: (form.version || 1) + 1, updatedBy: req.user.id }, { transaction: t });

      await recordConfigVersion({
        configId: `form:${form.formKey}`,
        entityType: 'form_field',
        entityName: `Added field '${created.label}' to ${form.formName}`,
        previousConfig: null,
        newConfig: created.toJSON(),
        user: req.user,
        reason: 'New form field added',
        transaction: t
      });

      return created;
    });

    await logActionSafe({
      user: req.user,
      action: 'FORM_FIELD_CREATED',
      title: `Added field '${field.label}' on ${form.formName}`,
      module: 'Form Builder',
      entity: 'FormField',
      affectedRecordId: field.id,
      updatedValue: field.toJSON(),
      correlationId,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: field });
  } catch (error) {
    console.error('Add form field error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to add form field.' });
  }
};

exports.checkFieldTypeCompatibility = async (req, res) => {
  try {
    const { formId, fieldId } = req.params;
    const { targetFieldType } = req.body;

    const [form, field] = await Promise.all([
      FormDefinition.findByPk(formId, { raw: true }),
      FormField.findByPk(fieldId, { raw: true })
    ]);
    if (!form || !field) {
      return res.status(404).json({ success: false, message: 'Form or field not found.' });
    }

    if (!form.tableNameRef || targetFieldType === field.fieldType) {
      return res.json({
        success: true,
        data: {
          compatible: true,
          totalRecordsScanned: 0,
          nonEmptyValues: 0,
          incompatibleCount: 0,
          sampleInvalidValues: []
        }
      });
    }

    // Read-only scan of existing database rows to analyze compatibility safely
    let values = [];
    try {
      if (field.isCore) {
        const [rows] = await sequelize.query(
          `SELECT "${field.fieldKey}" AS val FROM "${form.tableNameRef}" WHERE "${field.fieldKey}" IS NOT NULL LIMIT 2000`
        );
        values = rows.map(r => r.val);
      } else {
        const [rows] = await sequelize.query(
          `SELECT "customFields"->>'${field.fieldKey}' AS val FROM "${form.tableNameRef}" WHERE "customFields"->>'${field.fieldKey}' IS NOT NULL LIMIT 2000`
        );
        values = rows.map(r => r.val);
      }
    } catch (scanErr) {
      values = [];
    }

    const nonEmpty = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    const invalidSamples = [];
    let incompatibleCount = 0;

    nonEmpty.forEach(v => {
      const str = String(v).trim();
      let isValid = true;
      if (targetFieldType === 'number') {
        isValid = !Number.isNaN(Number(str));
      } else if (targetFieldType === 'email') {
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
      } else if (targetFieldType === 'date') {
        isValid = !Number.isNaN(Date.parse(str));
      } else if (targetFieldType === 'checkbox') {
        isValid = ['true', 'false', '0', '1', 'yes', 'no'].includes(str.toLowerCase());
      }
      if (!isValid) {
        incompatibleCount++;
        if (invalidSamples.length < 10) invalidSamples.push(str);
      }
    });

    res.json({
      success: true,
      data: {
        compatible: incompatibleCount === 0,
        currentType: field.fieldType,
        targetType: targetFieldType,
        totalRecordsScanned: values.length,
        nonEmptyValues: nonEmpty.length,
        incompatibleCount,
        sampleInvalidValues: invalidSamples,
        proposedConversion: incompatibleCount === 0
          ? `All ${nonEmpty.length} existing values are compatible with '${targetFieldType}'.`
          : `${incompatibleCount} existing value(s) cannot be automatically cast to '${targetFieldType}'. Original values will be preserved in history if you confirm.`
      }
    });
  } catch (error) {
    console.error('Field type compatibility check error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze field type compatibility.' });
  }
};

exports.updateFormField = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { formId, fieldId } = req.params;
    const [form, field] = await Promise.all([
      FormDefinition.findByPk(formId),
      FormField.findByPk(fieldId)
    ]);

    if (!form || !field || field.formId !== form.id) {
      return res.status(404).json({ success: false, message: 'Form or field not found.' });
    }

    const {
      label,
      description,
      fieldType,
      isRequired,
      defaultValue,
      validationRules,
      options,
      conditionalRules,
      confirmTypeChange,
      reason
    } = req.body;

    const isTypeChanging = fieldType && fieldType !== field.fieldType;
    if (isTypeChanging && !confirmTypeChange) {
      return res.status(400).json({
        success: false,
        code: 'TYPE_CHANGE_CONFIRMATION_REQUIRED',
        message: 'Changing a field type requires explicit confirmation after compatibility analysis.'
      });
    }

    const prevSnapshot = field.toJSON();
    const typeHistory = Array.isArray(field.previousTypeHistory) ? [...field.previousTypeHistory] : [];
    if (isTypeChanging) {
      typeHistory.push({
        fromType: field.fieldType,
        toType: fieldType,
        changedAt: new Date().toISOString(),
        changedBy: req.user.email
      });
    }

    await sequelize.transaction(async (t) => {
      await field.update({
        label: label !== undefined ? String(label).trim() : field.label,
        description: description !== undefined ? description : field.description,
        fieldType: fieldType || field.fieldType,
        isRequired: isRequired !== undefined ? Boolean(isRequired) : field.isRequired,
        defaultValue: defaultValue !== undefined ? defaultValue : field.defaultValue,
        validationRules: validationRules !== undefined ? validationRules : field.validationRules,
        options: options !== undefined ? options : field.options,
        conditionalRules: conditionalRules !== undefined ? conditionalRules : field.conditionalRules,
        previousTypeHistory: typeHistory
      }, { transaction: t });

      await form.update({ version: (form.version || 1) + 1, updatedBy: req.user.id }, { transaction: t });

      await recordConfigVersion({
        configId: `form:${form.formKey}`,
        entityType: 'form_field',
        entityName: `Updated field '${field.label}' on ${form.formName}`,
        previousConfig: prevSnapshot,
        newConfig: field.toJSON(),
        user: req.user,
        reason: reason || 'Form field updated',
        transaction: t
      });
    });

    await logActionSafe({
      user: req.user,
      action: prevSnapshot.label !== field.label ? 'FORM_FIELD_RENAMED' : 'FORM_FIELD_UPDATED',
      title: `Updated field '${field.label}' on ${form.formName}`,
      module: 'Form Builder',
      entity: 'FormField',
      affectedRecordId: field.id,
      previousValue: prevSnapshot,
      updatedValue: field.toJSON(),
      reason: reason || null,
      correlationId,
      ipAddress: req.ip
    });

    res.json({ success: true, data: field });
  } catch (error) {
    console.error('Update form field error:', error);
    res.status(500).json({ success: false, message: 'Failed to update form field.' });
  }
};

exports.reorderFormFields = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { formId } = req.params;
    const { orderedFieldIds = [] } = req.body;
    const form = await FormDefinition.findByPk(formId);
    if (!form) return res.status(404).json({ success: false, message: 'Form not found.' });

    await sequelize.transaction(async (t) => {
      for (let i = 0; i < orderedFieldIds.length; i++) {
        await FormField.update(
          { displayOrder: i + 1 },
          { where: { id: orderedFieldIds[i], formId }, transaction: t }
        );
      }
      await form.update({ version: (form.version || 1) + 1, updatedBy: req.user.id }, { transaction: t });
    });

    invalidateConfigCache();

    await logActionSafe({
      user: req.user,
      action: 'FORM_FIELDS_REORDERED',
      title: `Reordered fields on ${form.formName}`,
      module: 'Form Builder',
      entity: 'FormDefinition',
      affectedRecordId: form.id,
      updatedValue: { orderedFieldIds },
      correlationId,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Field order saved.' });
  } catch (error) {
    console.error('Reorder fields error:', error);
    res.status(500).json({ success: false, message: 'Failed to reorder form fields.' });
  }
};

exports.updateFormFieldStatus = async (req, res) => {
  const correlationId = newCorrelationId();
  try {
    const { formId, fieldId } = req.params;
    const { status, confirmed, reason } = req.body;

    if (!['active', 'disabled', 'archived'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'active', 'disabled', or 'archived'." });
    }

    const [form, field] = await Promise.all([
      FormDefinition.findByPk(formId),
      FormField.findByPk(fieldId)
    ]);
    if (!form || !field || field.formId !== form.id) {
      return res.status(404).json({ success: false, message: 'Form or field not found.' });
    }

    if (status === 'archived' && !confirmed) {
      return res.status(400).json({
        success: false,
        message: 'Explicit confirmation is required to archive a form field.'
      });
    }

    const prevStatus = field.status;
    await sequelize.transaction(async (t) => {
      await field.update({
        status,
        archivedAt: status === 'archived' ? new Date() : (status === 'active' ? null : field.archivedAt),
        archivedBy: status === 'archived' ? req.user.id : (status === 'active' ? null : field.archivedBy)
      }, { transaction: t });

      await form.update({ version: (form.version || 1) + 1, updatedBy: req.user.id }, { transaction: t });

      await recordConfigVersion({
        configId: `form:${form.formKey}`,
        entityType: 'form_field',
        entityName: `Field '${field.label}' status -> ${status}`,
        previousConfig: { status: prevStatus },
        newConfig: { status },
        user: req.user,
        reason: reason || `Field marked as ${status}`,
        transaction: t
      });
    });

    const actionCode = status === 'archived'
      ? 'FORM_FIELD_ARCHIVED'
      : (prevStatus === 'archived' && status === 'active' ? 'FORM_FIELD_RESTORED' : 'FORM_FIELD_STATUS_CHANGED');

    await logActionSafe({
      user: req.user,
      action: actionCode,
      title: `Field '${field.label}' on ${form.formName} set to ${status}`,
      module: 'Form Builder',
      entity: 'FormField',
      affectedRecordId: field.id,
      previousValue: { status: prevStatus },
      updatedValue: { status },
      reason: reason || null,
      correlationId,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: field,
      message: status === 'archived'
        ? `Field '${field.label}' archived. Historical record values remain visible; new entries exclude this field.`
        : `Field '${field.label}' status updated to ${status}.`
    });
  } catch (error) {
    console.error('Update field status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update field status.' });
  }
};

