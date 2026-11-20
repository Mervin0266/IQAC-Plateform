'use strict';

const { Op } = require('sequelize');
const { Faculty, User } = require('../models');

const normalizeEmpIdKey = (val) => String(val || '').trim().toUpperCase();

/**
 * Common Contributor Resolution Service
 *
 * Implements authoritative Section 3 Contributor Management Rules:
 * - Verified Faculty: Valid EmpID exists in Faculty Details -> authoritative Name, Dept, Designation from Faculty
 * - Conflicting Name with Valid EmpID: Authoritative name from Faculty is used (not overwritten by manual input)
 * - Guest Faculty: EmpID is blank / missing, and Name is supplied -> 'Guest Faculty'
 * - Unverified Faculty: EmpID is non-empty, not found in Faculty Details, and Name is supplied -> 'Unverified Faculty'
 * - Incomplete / Missing: EmpID not found & Name missing, or both missing -> rejected as invalid contributor
 *
 * Supports multiple contributors per record without duplicating the parent record.
 */
async function resolveContributors(contributors = [], transaction = null) {
  if (!Array.isArray(contributors)) {
    return {
      associations: [],
      hasIncompleteContributors: false,
      incompleteCount: 0,
      errors: ['Contributors list must be an array.']
    };
  }

  // 1. Gather all non-empty EmpIDs
  const empIdsToLookup = new Set();
  contributors.forEach(c => {
    const rawId = String(
      (typeof c === 'string' ? c : (c.employeeId || c.empId || c.EmpId || c.EmpID)) || ''
    ).trim();
    if (rawId && rawId.toLowerCase() !== 'nil' && rawId.toLowerCase() !== 'n/a' && rawId.toUpperCase() !== 'GUEST') {
      empIdsToLookup.add(rawId);
    }
  });

  // 2. Fetch authoritative Faculty records
  const facultyRecords = empIdsToLookup.size > 0
    ? await Faculty.findAll({
        where: {
          [Op.or]: [
            { employeeId: { [Op.in]: Array.from(empIdsToLookup) } },
            Faculty.sequelize.where(
              Faculty.sequelize.fn('UPPER', Faculty.sequelize.col('employeeId')),
              { [Op.in]: Array.from(empIdsToLookup).map(normalizeEmpIdKey) }
            )
          ]
        },
        attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email', 'status'],
        transaction
      })
    : [];

  const facultyByNormEmp = new Map();
  facultyRecords.forEach(f => {
    facultyByNormEmp.set(normalizeEmpIdKey(f.employeeId), f);
  });

  const associations = [];
  const errors = [];
  let hasIncompleteContributors = false;
  let incompleteCount = 0;

  contributors.forEach((contributor, idx) => {
    const displayOrder = idx;
    let rawEmpId = '';
    let rawName = '';
    let rawDept = '';
    let rawDesig = '';

    if (typeof contributor === 'string') {
      rawEmpId = contributor.trim();
    } else if (contributor && typeof contributor === 'object') {
      rawEmpId = String(contributor.employeeId || contributor.empId || contributor.EmpId || contributor.EmpID || '').trim();
      rawName = String(contributor.name || contributor.facultyName || contributor.Name || contributor.FacultyName || contributor.authorName || '').trim();
      rawDept = String(contributor.department || contributor.Department || '').trim();
      rawDesig = String(contributor.designation || contributor.Designation || '').trim();
    }

    const isEmpIdBlank = !rawEmpId || rawEmpId.toLowerCase() === 'nil' || rawEmpId.toLowerCase() === 'n/a' || rawEmpId.toUpperCase() === 'GUEST';
    const isNameBlank = !rawName || rawName.toLowerCase() === 'nil' || rawName.toLowerCase() === 'n/a';

    // Case 6: Both EmpID and Name are missing -> Reject
    if (isEmpIdBlank && isNameBlank) {
      hasIncompleteContributors = true;
      incompleteCount++;
      errors.push(`Contributor at position ${idx + 1} has neither EmpID nor Name.`);
      return;
    }

    // Case 3: EmpID is blank and Name is supplied -> Guest Faculty
    if (isEmpIdBlank && !isNameBlank) {
      associations.push({
        facultyId: null,
        employeeId: null,
        normalizedEmployeeId: null,
        facultyName: rawName,
        designation: rawDesig || 'Guest Faculty',
        department: rawDept || null,
        contributorType: 'Guest Faculty',
        isGuestFaculty: true,
        displayOrder
      });
      return;
    }

    // EmpID is non-empty -> Check Faculty Management
    const normKey = normalizeEmpIdKey(rawEmpId);
    const matchedFaculty = facultyByNormEmp.get(normKey);

    if (matchedFaculty) {
      // Case 1 & Case 2: Valid EmpID -> Use authoritative name and details from Faculty Details!
      associations.push({
        facultyId: matchedFaculty.id,
        employeeId: matchedFaculty.employeeId,
        normalizedEmployeeId: normKey,
        facultyName: matchedFaculty.name, // Authoritative Name always preserved
        designation: matchedFaculty.designation || rawDesig || 'Faculty',
        department: matchedFaculty.department || rawDept || null,
        school: null,
        campus: null,
        contributorType: 'Verified Faculty',
        isGuestFaculty: false,
        displayOrder
      });
    } else {
      // EmpID not found in Faculty Management
      if (!isNameBlank) {
        // Case 4: Non-empty unknown EmpID and Name supplied -> Unverified Faculty (Preserve both!)
        associations.push({
          facultyId: null,
          employeeId: rawEmpId,
          normalizedEmployeeId: normKey,
          facultyName: rawName,
          designation: rawDesig || 'Unverified Faculty',
          department: rawDept || null,
          contributorType: 'Unverified Faculty',
          isGuestFaculty: false, // Never silently converted to Guest Faculty!
          displayOrder
        });
      } else {
        // Case 5: Non-empty unknown EmpID but Name is missing -> Incomplete & rejected!
        hasIncompleteContributors = true;
        incompleteCount++;
        errors.push(`Contributor "${rawEmpId}" at position ${idx + 1} is not found in Faculty Details and has no Name provided.`);
      }
    }
  });

  return {
    associations,
    hasIncompleteContributors,
    incompleteCount,
    errors
  };
}

module.exports = {
  resolveContributors,
  normalizeEmpIdKey
};
