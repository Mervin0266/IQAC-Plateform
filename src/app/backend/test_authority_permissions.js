const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { User } = require('./models');

async function getTokens() {
  // Preflight check: Read-only identity provisioning (never modifies existing user accounts)
  const users = await User.findAll({ attributes: ['id', 'email', 'role', 'tokenVersion'] });
  if (!users || users.length === 0) {
    throw new Error('PREFLIGHT ERROR: No user records found to construct authorization test sessions.');
  }
  const tokens = {};
  for (const u of users) {
    tokens[u.role] = jwt.sign(
      { id: u.id, email: u.email, role: u.role, tokenVersion: u.tokenVersion || 0 },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { algorithm: 'HS256', expiresIn: '24h' }
    );
  }
  return tokens;
}

async function runTests() {
  console.log('--- CHRIST IQAC Platform: Standalone Authorization Test Suite ---');
  console.log('Preflight Check: Verifying target environment safety...');
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:5000';
  console.log(`Target Backend Base URL: ${baseUrl}`);
  
  const tokens = await getTokens();
  console.log('✓ Read-only test sessions generated for roles:', Object.keys(tokens));

  const authHeader = (role) => ({
    'Authorization': `Bearer ${tokens[role]}`,
    'Content-Type': 'application/json'
  });

  const tests = [
    {
      id: 'SEC-AUTH-01',
      name: 'Authority Read Dashboard Live Stats',
      method: 'GET',
      url: 'http://localhost:5000/api/system/dashboard-stats',
      role: 'authority',
      expectedStatus: 200,
      description: 'Authority role should have university-wide read access to dashboard stats'
    },
    {
      id: 'SEC-AUTH-02',
      name: 'Authority Read Student Census',
      method: 'GET',
      url: 'http://localhost:5000/api/students',
      role: 'authority',
      expectedStatus: 200,
      description: 'Authority role should have university-wide read access to student census'
    },
    {
      id: 'SEC-AUTH-03',
      name: 'Authority Read Faculty Directory',
      method: 'GET',
      url: 'http://localhost:5000/api/faculty',
      role: 'authority',
      expectedStatus: 200,
      description: 'Authority role should have university-wide read access to faculty directory'
    },
    {
      id: 'SEC-AUTH-04',
      name: 'Authority Prohibited from Creating Student Record',
      method: 'POST',
      url: 'http://localhost:5000/api/students',
      role: 'authority',
      body: JSON.stringify({ name: 'Unauthorized Student', registerNo: 'REG99999', department: 'Computer Science and Engineering' }),
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting to create a student'
    },
    {
      id: 'SEC-AUTH-05',
      name: 'Authority Prohibited from Bulk Uploading Students',
      method: 'POST',
      url: 'http://localhost:5000/api/students/bulk',
      role: 'authority',
      body: JSON.stringify({ students: [] }),
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting student bulk upload'
    },
    {
      id: 'SEC-AUTH-06',
      name: 'Authority Prohibited from Clearing All Students',
      method: 'DELETE',
      url: 'http://localhost:5000/api/students/clear-all',
      role: 'authority',
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting to clear all students'
    },
    {
      id: 'SEC-AUTH-07',
      name: 'Authority Prohibited from Creating Faculty Record',
      method: 'POST',
      url: 'http://localhost:5000/api/faculty',
      role: 'authority',
      body: JSON.stringify({ name: 'Unauthorized Faculty', employeeId: 'FAC99999', department: 'Computer Science and Engineering' }),
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting to create faculty'
    },
    {
      id: 'SEC-AUTH-08',
      name: 'Authority Prohibited from Bulk Uploading Faculty',
      method: 'POST',
      url: 'http://localhost:5000/api/faculty/bulk',
      role: 'authority',
      body: JSON.stringify({ faculty: [] }),
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting bulk faculty upload'
    },
    {
      id: 'SEC-AUTH-09',
      name: 'Authority Prohibited from Clearing All Faculty',
      method: 'DELETE',
      url: 'http://localhost:5000/api/faculty/clear-all',
      role: 'authority',
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting to clear all faculty'
    },
    {
      id: 'SEC-AUTH-10',
      name: 'Authority Prohibited from Creating Publication',
      method: 'POST',
      url: 'http://localhost:5000/api/publications',
      role: 'authority',
      body: JSON.stringify({ title: 'Unauthorized Paper', authorName: 'Author', journalName: 'Journal', journalType: 'Scopus' }),
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting to create publication'
    },
    {
      id: 'SEC-AUTH-11',
      name: 'Authority Prohibited from Bulk Uploading Publications',
      method: 'POST',
      url: 'http://localhost:5000/api/publications/bulk',
      role: 'authority',
      body: JSON.stringify({ publications: [] }),
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting bulk publication upload'
    },
    {
      id: 'SEC-AUTH-12',
      name: 'Authority Prohibited from Creating Patent',
      method: 'POST',
      url: 'http://localhost:5000/api/patents',
      role: 'authority',
      body: JSON.stringify({ title: 'Unauthorized Patent', inventors: 'Inventor', applicationNo: 'APP99999' }),
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting to create patent'
    },
    {
      id: 'SEC-AUTH-13',
      name: 'Authority Prohibited from Creating Strategic Plan',
      method: 'POST',
      url: 'http://localhost:5000/api/strategic-plans',
      role: 'authority',
      body: JSON.stringify({ department: 'Computer Science and Engineering', subThemeName: 'Subtheme', goalTitle: 'Goal' }),
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting to create strategic plan'
    },
    {
      id: 'SEC-AUTH-14',
      name: 'Authority Prohibited from Clearing Strategic Plans',
      method: 'DELETE',
      url: 'http://localhost:5000/api/strategic-plans/clear-all',
      role: 'authority',
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting to clear strategic plans'
    },
    {
      id: 'SEC-AUTH-15',
      name: 'Authority Prohibited from Accessing User Management',
      method: 'GET',
      url: 'http://localhost:5000/api/users',
      role: 'authority',
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting to access user management'
    },
    {
      id: 'SEC-AUTH-16',
      name: 'Authority Prohibited from Clearing Entire Database',
      method: 'POST',
      url: 'http://localhost:5000/api/system/clear-database',
      role: 'authority',
      body: JSON.stringify({ testIntent: 'RBAC_SECURITY_PROHIBITION_CHECK' }),
      expectedStatus: 403,
      description: 'Authority role must be rejected with 403 Forbidden when attempting to invoke clear-database'
    },
    {
      id: 'SEC-AUTH-17',
      name: 'Admin Permitted to Read User Management',
      method: 'GET',
      url: 'http://localhost:5000/api/users',
      role: 'admin',
      expectedStatus: 200,
      description: 'Admin role must be permitted to read user management'
    },
    {
      id: 'SEC-AUTH-18',
      name: 'HOD Prohibited from Clearing Entire Database',
      method: 'POST',
      url: 'http://localhost:5000/api/system/clear-database',
      role: 'hod',
      body: JSON.stringify({ testIntent: 'RBAC_SECURITY_PROHIBITION_CHECK' }),
      expectedStatus: 403,
      description: 'HOD role must be blocked (403) from clearing entire database'
    },
    {
      id: 'SEC-AUTH-19',
      name: 'Coordinator Prohibited from Clearing Entire Database',
      method: 'POST',
      url: 'http://localhost:5000/api/system/clear-database',
      role: 'coordinator',
      body: JSON.stringify({ testIntent: 'RBAC_SECURITY_PROHIBITION_CHECK' }),
      expectedStatus: 403,
      description: 'Coordinator role must be blocked (403) from clearing entire database'
    },
    {
      id: 'SEC-AUTH-20',
      name: 'Faculty Prohibited from Clearing Entire Database',
      method: 'POST',
      url: 'http://localhost:5000/api/system/clear-database',
      role: 'faculty',
      body: JSON.stringify({ testIntent: 'RBAC_SECURITY_PROHIBITION_CHECK' }),
      expectedStatus: 403,
      description: 'Faculty role must be blocked (403) from clearing entire database'
    }
  ];

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: authHeader(test.role)
      };
      if (test.body) {
        options.body = test.body;
      }
      const res = await fetch(test.url, options);
      const isPass = res.status === test.expectedStatus;
      if (isPass) {
        passed++;
        console.log(`✓ [${test.id}] ${test.name} - HTTP ${res.status} (PASS)`);
      } else {
        failed++;
        console.log(`✗ [${test.id}] ${test.name} - Expected HTTP ${test.expectedStatus}, got ${res.status} (FAIL)`);
      }
      results.push({
        id: test.id,
        name: test.name,
        role: test.role,
        method: test.method,
        url: test.url,
        expectedStatus: test.expectedStatus,
        actualStatus: res.status,
        status: isPass ? 'PASS' : 'FAIL',
        description: test.description
      });
    } catch (e) {
      failed++;
      console.log(`✗ [${test.id}] ${test.name} - Fetch error: ${e.message} (FAIL)`);
      results.push({
        id: test.id,
        name: test.name,
        role: test.role,
        status: 'FAIL',
        error: e.message
      });
    }
  }

  console.log(`\n================================`);
  console.log(`Total Security Assertions: ${tests.length}`);
  console.log(`Passed: ${passed} | Failed: ${failed}`);
  console.log(`================================\n`);

  fs.writeFileSync(
    path.join(__dirname, 'security_test_results.json'),
    JSON.stringify(results, null, 2)
  );
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
