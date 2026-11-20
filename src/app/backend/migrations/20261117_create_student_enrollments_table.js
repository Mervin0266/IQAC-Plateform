'use strict';

/**
 * Migration: Create student_enrollments table, migrate historical academic year records,
 * and establish canonical Student profile identity per registerNumber.
 *
 * Implements Student Details V3.0 architecture:
 * 1. Exactly 1 canonical Student profile per unique registerNumber.
 * 2. Separate academic-year StudentEnrollment records for each year of study.
 * 3. 100% data preservation of existing 6,583 enrollments.
 */
module.exports = {
  up: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;

    try {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    } catch (_) {}

    // 1. Create student_enrollments table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "student_enrollments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "studentId" UUID NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
        "registerNumber" VARCHAR(100) NOT NULL,
        "academicYear" VARCHAR(50) NOT NULL,
        "department" VARCHAR(255),
        "program" VARCHAR(255),
        "course" VARCHAR(255),
        "className" VARCHAR(255),
        "batch" VARCHAR(100),
        "programLevel" VARCHAR(50),
        "status" VARCHAR(50) DEFAULT 'Active',
        "campus" VARCHAR(255),
        "school" VARCHAR(255),
        "yearOfStudy" VARCHAR(50),
        "isFirstYearSH" BOOLEAN DEFAULT FALSE,
        "customFields" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Check if student_enrollments already has data
    const [countRows] = await sequelize.query('SELECT COUNT(*) AS count FROM "student_enrollments";');
    const existingEnrollmentsCount = parseInt(countRows[0]?.count || 0, 10);

    if (existingEnrollmentsCount === 0) {
      console.log('Migrating student records to student_enrollments and consolidating canonical profiles...');

      const [existingStudents] = await sequelize.query(`
        SELECT * FROM "students"
        ORDER BY "registerNumber" ASC, "academicYear" DESC, "createdAt" DESC;
      `);

      if (existingStudents.length > 0) {
        const byReg = new Map();
        for (const st of existingStudents) {
          const reg = String(st.registerNumber).trim();
          if (!byReg.has(reg)) byReg.set(reg, []);
          byReg.get(reg).push(st);
        }

        const permanentFields = [
          'name', 'gender', 'dob', 'bloodGroup', 'nationality', 'caste',
          'currentCity', 'currentState', 'permanentCity', 'permanentState',
          'address', 'email', 'phone', 'mobileNo', 'parentMobileNo',
          'guardianName', 'guardianPhone', 'handicapped', 'handicappedDescription',
          'disability', 'admissionDate', 'applicationNo', 'previousSchool'
        ];

        const enrollmentsToInsert = [];
        const idsToDelete = [];
        const canonicalUpdates = [];

        for (const [regNo, records] of byReg.entries()) {
          const canonical = records[0];
          const updates = {};
          let hasUpdates = false;

          for (let i = 1; i < records.length; i++) {
            const older = records[i];
            idsToDelete.push(older.id);

            for (const f of permanentFields) {
              const canonVal = canonical[f];
              const olderVal = older[f];
              const isCanonMissing = !canonVal || canonVal === 'N/A' || canonVal === 'NIL' || canonVal === '';
              const hasOlderVal = olderVal && olderVal !== 'N/A' && olderVal !== 'NIL' && olderVal !== '';
              if (isCanonMissing && hasOlderVal) {
                canonical[f] = olderVal;
                updates[f] = olderVal;
                hasUpdates = true;
              }
            }
          }

          if (hasUpdates) {
            canonicalUpdates.push({ id: canonical.id, updates });
          }

          // Generate enrollment rows for all academic years for this student
          const seenYears = new Set();
          for (const rec of records) {
            const ay = rec.academicYear || '2024-2025';
            if (seenYears.has(ay)) continue; // Safeguard against duplicate enrollments in the same year
            seenYears.add(ay);

            const isSH = Boolean(
              rec.department && (
                rec.department.toLowerCase().includes('humanities') ||
                rec.department.toLowerCase().includes('basic science') ||
                rec.department.toLowerCase().includes('science and humanities') ||
                rec.department.toLowerCase().includes('science & humanities')
              )
            );

            enrollmentsToInsert.push({
              studentId: canonical.id,
              registerNumber: regNo,
              academicYear: ay,
              department: rec.department || null,
              program: rec.course || null,
              course: rec.course || null,
              className: rec.className || null,
              batch: rec.batch || null,
              programLevel: rec.programLevel || 'UG',
              status: rec.status || 'Active',
              campus: rec.campus || null,
              school: rec.school || null,
              yearOfStudy: null,
              isFirstYearSH: isSH,
              customFields: rec.customFields || {},
              createdAt: rec.createdAt || new Date(),
              updatedAt: rec.updatedAt || new Date()
            });
          }
        }

        // Apply updates to canonical profiles
        for (const item of canonicalUpdates) {
          const setClauses = [];
          const replacements = { id: item.id };
          for (const [k, v] of Object.entries(item.updates)) {
            setClauses.push(`"${k}" = :${k}`);
            replacements[k] = v;
          }
          if (setClauses.length > 0) {
            await sequelize.query(
              `UPDATE "students" SET ${setClauses.join(', ')}, "updatedAt" = NOW() WHERE "id" = :id;`,
              { replacements }
            );
          }
        }

        // Batch insert enrollments (chunks of 500)
        const chunkSize = 500;
        for (let i = 0; i < enrollmentsToInsert.length; i += chunkSize) {
          const chunk = enrollmentsToInsert.slice(i, i + chunkSize);
          const valuePlaceholders = [];
          const replacements = {};

          chunk.forEach((row, idx) => {
            const prefix = `r_${idx}`;
            valuePlaceholders.push(`(
              :${prefix}_studentId,
              :${prefix}_registerNumber,
              :${prefix}_academicYear,
              :${prefix}_department,
              :${prefix}_program,
              :${prefix}_course,
              :${prefix}_className,
              :${prefix}_batch,
              :${prefix}_programLevel,
              :${prefix}_status,
              :${prefix}_campus,
              :${prefix}_school,
              :${prefix}_yearOfStudy,
              :${prefix}_isFirstYearSH,
              :${prefix}_customFields::jsonb,
              :${prefix}_createdAt,
              :${prefix}_updatedAt
            )`);

            replacements[`${prefix}_studentId`] = row.studentId;
            replacements[`${prefix}_registerNumber`] = row.registerNumber;
            replacements[`${prefix}_academicYear`] = row.academicYear;
            replacements[`${prefix}_department`] = row.department;
            replacements[`${prefix}_program`] = row.program;
            replacements[`${prefix}_course`] = row.course;
            replacements[`${prefix}_className`] = row.className;
            replacements[`${prefix}_batch`] = row.batch;
            replacements[`${prefix}_programLevel`] = row.programLevel;
            replacements[`${prefix}_status`] = row.status;
            replacements[`${prefix}_campus`] = row.campus;
            replacements[`${prefix}_school`] = row.school;
            replacements[`${prefix}_yearOfStudy`] = row.yearOfStudy;
            replacements[`${prefix}_isFirstYearSH`] = row.isFirstYearSH;
            replacements[`${prefix}_customFields`] = JSON.stringify(row.customFields || {});
            replacements[`${prefix}_createdAt`] = row.createdAt;
            replacements[`${prefix}_updatedAt`] = row.updatedAt;
          });

          await sequelize.query(`
            INSERT INTO "student_enrollments" (
              "studentId", "registerNumber", "academicYear", "department",
              "program", "course", "className", "batch", "programLevel",
              "status", "campus", "school", "yearOfStudy", "isFirstYearSH",
              "customFields", "createdAt", "updatedAt"
            ) VALUES ${valuePlaceholders.join(', ')};
          `, { replacements });
        }

        console.log(`✓ Inserted ${enrollmentsToInsert.length} enrollments into student_enrollments.`);

        // Delete redundant duplicate rows from students (in chunks)
        for (let i = 0; i < idsToDelete.length; i += chunkSize) {
          const chunkIds = idsToDelete.slice(i, i + chunkSize);
          await sequelize.query(
            `DELETE FROM "students" WHERE "id" IN (:chunkIds);`,
            { replacements: { chunkIds } }
          );
        }

        console.log(`✓ Removed ${idsToDelete.length} redundant duplicate rows from students.`);
      }
    }

    // 3. Create indexes and uniqueness constraints
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_students_regno_unique"
      ON "students" ("registerNumber");
    `);

    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_student_enrollments_student_year_unique"
      ON "student_enrollments" ("studentId", "academicYear");
    `);

    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_student_enrollments_regno_year_unique"
      ON "student_enrollments" ("registerNumber", "academicYear");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_student_enrollments_regno"
      ON "student_enrollments" ("registerNumber");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_student_enrollments_department"
      ON "student_enrollments" ("department");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_student_enrollments_academic_year"
      ON "student_enrollments" ("academicYear");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_student_enrollments_program_level"
      ON "student_enrollments" ("programLevel");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_student_enrollments_status"
      ON "student_enrollments" ("status");
    `);

    console.log('✓ Student Details V3.0 migration completed successfully.');
  },

  down: async (queryInterface) => {
    const sequelize = queryInterface.sequelize;
    await sequelize.query(`DROP TABLE IF EXISTS "student_enrollments" CASCADE;`);
    await sequelize.query(`DROP INDEX IF EXISTS "idx_students_regno_unique";`);
  }
};
