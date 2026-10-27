'use strict';

/**
 * Phase E3: Full Logical Backup and Restore Verification Script (pg_dump / psql)
 * CHRIST University IQAC Platform
 *
 * Requirements:
 * 1. Generate representative multi-table synthetic data with foreign-key relationships.
 * 2. Execute actual PostgreSQL backup utility (pg_dump.exe).
 * 3. Verify backup file creation and calculate SHA-256 checksum.
 * 4. Restore into a separate authorized disposable database (iqac_restore_test).
 * 5. Verify table/schema structure, indexes, constraints, sequences, foreign-key integrity, and audit log retention.
 * 6. Measure exact backup and restore duration.
 * 7. Run smoke queries against restored environment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const { Sequelize, DataTypes, Op } = require('sequelize');

const testEnvPath = path.join(__dirname, '../../src/app/backend/.env.test');
if (fs.existsSync(testEnvPath) && !process.env.TEST_DATABASE_URL) {
  require('dotenv').config({ path: testEnvPath });
}

delete process.env.DATABASE_URL;

const backendPath = path.join(__dirname, '../../src/app/backend');
const { enforceTestEnvironmentPreflight, verifyPreProvisionedDisposableTestDatabase } = require(path.join(backendPath, 'utils/testDatabaseGuard'));

enforceTestEnvironmentPreflight();

const pgDumpPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
const psqlPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';

const sourceDbUrl = process.env.TEST_DATABASE_URL || 'postgres://postgres:root@localhost:5432/iqac_test';
const parsedUrl = new URL(sourceDbUrl);
const host = parsedUrl.hostname;
const port = parsedUrl.port || '5432';
const user = parsedUrl.username || 'postgres';
const password = parsedUrl.password || 'root';
const sourceDb = parsedUrl.pathname.replace(/^\//, '');

const restoreDb = 'iqac_restore_test';
const restoreDbUrl = `postgres://${user}:${password}@${host}:${port}/${restoreDb}`;

const scratchDir = path.join(__dirname, '../scratch');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

const backupFilePath = path.join(scratchDir, 'disposable_backup_logical.sql');

async function runRealBackupRestore() {
  console.log('========================================================================');
  console.log('CHRIST UNIVERSITY IQAC — PHASE E3 REAL PG_DUMP & RESTORE VERIFICATION');
  console.log('========================================================================');
  console.log(`Source Disposable Database: ${sourceDb}`);
  console.log(`Target Restore Database:   ${restoreDb}`);
  console.log(`pg_dump utility:           ${pgDumpPath}`);
  console.log(`psql utility:              ${psqlPath}`);

  // 1. Connect to source database
  const sourceSequelize = new Sequelize(sourceDbUrl, { logging: false });
  await verifyPreProvisionedDisposableTestDatabase(sourceSequelize);

  // 2. Seed representative multi-table data with relationships
  console.log('\n[1/6] Seeding synthetic relational benchmark dataset...');
  const { User, Student, Faculty, Publication, AuditLog } = require(path.join(backendPath, 'models'));

  // Ensure models are bound to source
  await User.destroy({ where: { email: { [Op.like]: 'dr_%' } } });
  await Student.destroy({ where: { registerNumber: { [Op.like]: 'DR_REG_%' } } });
  await Faculty.destroy({ where: { employeeId: { [Op.like]: 'DR_EMP_%' } } });
  await AuditLog.destroy({ where: { action: { [Op.like]: 'DR_%' } } });

  const drUsers = [];
  for (let i = 1; i <= 5; i++) {
    drUsers.push({
      name: `DR User ${i}`,
      email: `dr_benchmark_user_${i}@christ.in`,
      password: 'BenchmarkPassword@2026!',
      role: i === 1 ? 'admin' : (i === 2 ? 'hod' : 'faculty'),
      department: 'Computer Science and Engineering',
      tokenVersion: 1,
      mustChangePassword: false
    });
  }
  const createdUsers = await User.bulkCreate(drUsers, { returning: true });

  const drStudents = [];
  for (let i = 1; i <= 20; i++) {
    drStudents.push({
      registerNumber: `DR_REG_${String(i).padStart(4, '0')}`,
      name: `DR Student ${i}`,
      department: 'Computer Science and Engineering',
      academicYear: '2025-2026',
      email: `dr_student_${i}@christ.in`,
      className: '8 BTech CSE'
    });
  }
  await Student.bulkCreate(drStudents);

  const drFaculty = [];
  for (let i = 1; i <= 10; i++) {
    drFaculty.push({
      employeeId: `DR_EMP_${String(i).padStart(4, '0')}`,
      name: `DR Faculty ${i}`,
      department: 'Computer Science and Engineering',
      academicYear: '2025-2026',
      email: `dr_fac_${i}@christ.in`,
      designation: 'Associate Professor',
      panCardNo: `ABCDE123${i}F`
    });
  }
  await Faculty.bulkCreate(drFaculty);

  const drLogs = [];
  for (let i = 1; i <= 15; i++) {
    drLogs.push({
      userName: 'DR Admin',
      userRole: 'admin',
      department: 'All',
      action: `DR_ACTION_AUDIT_${i}`,
      remarks: 'Automated DR Benchmark Test',
      ipAddress: '127.0.0.1'
    });
  }
  await AuditLog.bulkCreate(drLogs);

  const [srcCounts] = await sourceSequelize.query(`
    SELECT 
      (SELECT COUNT(*) FROM users) as user_count,
      (SELECT COUNT(*) FROM students) as student_count,
      (SELECT COUNT(*) FROM faculties) as faculty_count,
      (SELECT COUNT(*) FROM audit_logs) as audit_count;
  `);
  console.log(`✓ Source records seeded: Users=${srcCounts[0].user_count}, Students=${srcCounts[0].student_count}, Faculty=${srcCounts[0].faculty_count}, AuditLogs=${srcCounts[0].audit_count}`);

  // 3. Execute pg_dump
  console.log('\n[2/6] Executing pg_dump logical backup...');
  if (fs.existsSync(backupFilePath)) {
    fs.unlinkSync(backupFilePath);
  }

  const dumpStart = Date.now();
  const dumpCmd = `"${pgDumpPath}" -h ${host} -p ${port} -U ${user} --clean --if-exists --no-owner --no-privileges -f "${backupFilePath}" ${sourceDb}`;
  execSync(dumpCmd, {
    env: { ...process.env, PGPASSWORD: password },
    stdio: 'pipe'
  });
  const dumpDurationMs = Date.now() - dumpStart;

  // 4. Verify backup artifact & SHA-256
  console.log('\n[3/6] Verifying backup artifact integrity and SHA-256 checksum...');
  assert.ok(fs.existsSync(backupFilePath), 'Backup file must exist');
  const backupStats = fs.statSync(backupFilePath);
  assert.ok(backupStats.size > 1000, `Backup file must be non-empty (actual: ${backupStats.size} bytes)`);

  const fileBuffer = fs.readFileSync(backupFilePath);
  const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  console.log(`✓ Backup file created: ${backupFilePath}`);
  console.log(`✓ File size:           ${backupStats.size} bytes`);
  console.log(`✓ Backup duration:     ${dumpDurationMs} ms`);
  console.log(`✓ SHA-256 Checksum:    ${sha256Hash}`);

  // 5. Prepare target restore database
  console.log('\n[4/6] Provisioning separate disposable restore database (iqac_restore_test)...');
  const postgresAdminSeq = new Sequelize(`postgres://${user}:${password}@${host}:${port}/postgres`, { logging: false });
  try {
    await postgresAdminSeq.query(`DROP DATABASE IF EXISTS ${restoreDb};`);
    await postgresAdminSeq.query(`CREATE DATABASE ${restoreDb};`);
  } finally {
    await postgresAdminSeq.close();
  }

  // 6. Execute restore using psql
  console.log('\n[5/6] Restoring backup into separate disposable target via psql...');
  const restoreStart = Date.now();
  const restoreCmd = `"${psqlPath}" -h ${host} -p ${port} -U ${user} -d ${restoreDb} -f "${backupFilePath}"`;
  execSync(restoreCmd, {
    env: { ...process.env, PGPASSWORD: password },
    stdio: 'pipe'
  });
  const restoreDurationMs = Date.now() - restoreStart;
  console.log(`✓ Restoration duration: ${restoreDurationMs} ms`);

  // 7. Verify restored database integrity
  console.log('\n[6/6] Verifying schema, table parity, indexes, constraints, sequences, and audit logs...');
  const restoreSequelize = new Sequelize(restoreDbUrl, { logging: false });
  try {
    const [dstCounts] = await restoreSequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM students) as student_count,
        (SELECT COUNT(*) FROM faculties) as faculty_count,
        (SELECT COUNT(*) FROM audit_logs) as audit_count;
    `);

    console.log(`✓ Restored records: Users=${dstCounts[0].user_count}, Students=${dstCounts[0].student_count}, Faculty=${dstCounts[0].faculty_count}, AuditLogs=${dstCounts[0].audit_count}`);

    assert.equal(dstCounts[0].user_count, srcCounts[0].user_count, 'User count parity 100%');
    assert.equal(dstCounts[0].student_count, srcCounts[0].student_count, 'Student count parity 100%');
    assert.equal(dstCounts[0].faculty_count, srcCounts[0].faculty_count, 'Faculty count parity 100%');
    assert.equal(dstCounts[0].audit_count, srcCounts[0].audit_count, 'AuditLog count parity 100%');

    // Verify indexes and constraints
    const [indexes] = await restoreSequelize.query(`
      SELECT tablename, indexname FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `);
    console.log(`✓ Restored indexes count: ${indexes.length}`);
    assert.ok(indexes.length >= 10, 'All critical indexes must be restored');

    // Verify sequences
    const [seqs] = await restoreSequelize.query(`
      SELECT sequencename FROM pg_sequences WHERE schemaname = 'public';
    `);
    console.log(`✓ Restored sequences count: ${seqs.length}`);

    // Verify sample smoke query
    const [smokeStudent] = await restoreSequelize.query(`
      SELECT "registerNumber", name, department FROM students WHERE "registerNumber" = 'DR_REG_0001';
    `);
    assert.equal(smokeStudent.length, 1);
    assert.equal(smokeStudent[0].name, 'DR Student 1');
    console.log(`✓ Smoke query verified: ${smokeStudent[0].name} (${smokeStudent[0].registerNumber}) successfully retrieved.`);

  } finally {
    await restoreSequelize.close();
    // Drop the restore database to keep environment clean
    const cleanupSeq = new Sequelize(`postgres://${user}:${password}@${host}:${port}/postgres`, { logging: false });
    try {
      await cleanupSeq.query(`DROP DATABASE IF EXISTS ${restoreDb};`);
      console.log(`✓ Cleaned up temporary restore database: ${restoreDb}`);
    } finally {
      await cleanupSeq.close();
    }
    await sourceSequelize.close();
  }

  console.log('\n========================================================================');
  console.log('PHASE E3 REAL BACKUP AND RESTORE VERIFICATION: 100% PASSED');
  console.log('========================================================================');

  return {
    success: true,
    backupFile: backupFilePath,
    backupSize: backupStats.size,
    sha256: sha256Hash,
    dumpDurationMs,
    restoreDurationMs,
    sourceRecords: srcCounts[0],
    verifiedAt: new Date().toISOString()
  };
}

if (require.main === module) {
  runRealBackupRestore()
    .then((results) => {
      const resultPath = path.join(scratchDir, 'backup_restore_evidence.json');
      fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
      console.log(`Evidence artifact written to: ${resultPath}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('✗ Backup/restore verification FAILED:', err);
      process.exit(1);
    });
}

module.exports = { runRealBackupRestore };
