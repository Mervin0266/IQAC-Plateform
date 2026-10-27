'use strict';

const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:Mervin%400206@localhost:5432/iqac_test';

const app = require('../../src/app/backend/server');

// 1. Extract live registered routes from Express app._router
function extractLiveRoutes(appInstance) {
  const routes = [];

  function walk(mountPath, layer) {
    if (layer.route) {
      const routePath = (mountPath + layer.route.path).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      methods.forEach(method => {
        routes.push({ method, endpoint: routePath });
      });
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      let routerPath = '';
      if (layer.regexp) {
        const match = layer.regexp.source
          .replace('\\/?(?=\\/|$)', '')
          .replace('^\\', '')
          .replace('\\/?$', '')
          .replace(/\\\//g, '/');
        routerPath = match.replace(/\^/g, '').replace(/\$/g, '').replace(/\\/g, '');
        if (!routerPath.startsWith('/')) routerPath = '/' + routerPath;
        if (routerPath.endsWith('/?')) routerPath = routerPath.slice(0, -2);
      }
      layer.handle.stack.forEach((subLayer) => {
        walk(routerPath, subLayer);
      });
    }
  }

  appInstance._router.stack.forEach((layer) => {
    walk('', layer);
  });

  // Filter unique routes and exclude wildcards
  const seen = new Set();
  const unique = [];
  routes.forEach(r => {
    const key = `${r.method} ${r.endpoint}`;
    if (!seen.has(key) && !r.endpoint.includes('*')) {
      seen.add(key);
      unique.push(r);
    }
  });

  return unique;
}

const liveRoutes = extractLiveRoutes(app);

// 2. Scan test files
const testsDir = path.join(__dirname, '../tests');
const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.cjs'));

const testCalls = []; // { file, method, endpoint, testId }

testFiles.forEach(file => {
  const content = fs.readFileSync(path.join(testsDir, file), 'utf8');

  // Match test('TEST_ID: ...'
  const testBlocks = content.split(/test\s*\(\s*['"]/);
  for (let i = 1; i < testBlocks.length; i++) {
    const block = testBlocks[i];
    const titleMatch = block.match(/^([A-Za-z0-9_-]+(?::\s*[^'"]+)?)/);
    const testTitle = titleMatch ? titleMatch[1] : `TEST_${i}`;
    const testId = testTitle.split(':')[0].trim();

    // Find all request(app).method('url') or request(app).method(`url`)
    const reqRegex = /request\s*\(\s*app\s*\)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*[`'"](\/api\/[^`'"]+)[\`'"]/gi;
    let match;
    while ((match = reqRegex.exec(block)) !== null) {
      const method = match[1].toUpperCase();
      let rawUrl = match[2].split('?')[0]; // strip query string
      rawUrl = rawUrl.replace(/\$\{[^}]+\}/g, 'PARAM'); // normalize template strings
      testCalls.push({ file, method, endpoint: rawUrl, testId });
    }

    // Match route in test title (e.g., "AUTH-FINAL-05-Patents: ... POST /api/patents/bulk -> 401")
    const titleRouteRegex = /(GET|POST|PUT|DELETE|PATCH)\s+(\/api\/[a-zA-Z0-9_\-\/:]+)/gi;
    let trMatch;
    while ((trMatch = titleRouteRegex.exec(testTitle)) !== null) {
      const method = trMatch[1].toUpperCase();
      const rawUrl = trMatch[2].split('?')[0];
      testCalls.push({ file, method, endpoint: rawUrl, testId });
    }
  }

  // Also match parameterized table objects: { method: 'get', path: '/api/...' }
  const tableRegex = /\{\s*method:\s*['"](get|post|put|delete|patch)['"]\s*,\s*path:\s*[`'"](\/api\/[^`'"]+)[\`'"]/gi;
  let tMatch;
  while ((tMatch = tableRegex.exec(content)) !== null) {
    const method = tMatch[1].toUpperCase();
    let rawUrl = tMatch[2].split('?')[0].replace(/\$\{[^}]+\}/g, 'PARAM');
    testCalls.push({ file, method, endpoint: rawUrl, testId: `TABLE_${file.replace('.test.cjs', '')}` });
  }
});

// Helper to check if a live route matches a test call
function routeMatches(liveRoute, call) {
  if (liveRoute.method !== call.method) return false;

  const liveParts = liveRoute.endpoint.split('/');
  const callParts = call.endpoint.split('/');

  if (liveParts.length !== callParts.length) return false;

  for (let i = 0; i < liveParts.length; i++) {
    const lp = liveParts[i];
    const cp = callParts[i];
    if (lp.startsWith(':')) {
      // parameter placeholder matches anything except empty
      if (!cp) return false;
    } else if (lp !== cp && cp !== 'PARAM') {
      return false;
    }
  }
  return true;
}

let testedMutativeCount = 0;
let totalMutativeCount = 0;
let testedReadCount = 0;
let totalReadCount = 0;
let testedRoutesCount = 0;

const routeDetails = liveRoutes.map((r, idx) => {
  const id = `R-${String(idx + 1).padStart(3, '0')}`;
  const isMutative = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(r.method);
  if (isMutative) totalMutativeCount++;
  else totalReadCount++;

  const matchingCalls = testCalls.filter(c => routeMatches(r, c));
  const isTested = matchingCalls.length > 0;
  if (isTested) {
    testedRoutesCount++;
    if (isMutative) testedMutativeCount++;
    else testedReadCount++;
  }

  const linkedTestIds = [...new Set(matchingCalls.map(c => `${c.testId} (${c.file})`))];

  return {
    id,
    method: r.method,
    endpoint: r.endpoint,
    isMutative,
    isTested,
    testCount: matchingCalls.length,
    linkedTestIds
  };
});

console.log('====================================================');
console.log('EXPRESS ROUTE RECONCILIATION SUMMARY');
console.log('====================================================');
console.log(`Total Express Routes Registered:    ${liveRoutes.length}`);
console.log(`- Mutative Routes (POST/PUT/DEL):   ${totalMutativeCount}`);
console.log(`- Read-Only Routes (GET):           ${totalReadCount}`);
console.log(`----------------------------------------------------`);
console.log(`Total Routes Behaviorally Tested:   ${testedRoutesCount} / ${liveRoutes.length} (${((testedRoutesCount/liveRoutes.length)*100).toFixed(1)}%)`);
console.log(`- Mutative Routes Tested:           ${testedMutativeCount} / ${totalMutativeCount} (${((testedMutativeCount/totalMutativeCount)*100).toFixed(1)}%)`);
console.log(`- Read-Only Routes Tested:          ${testedReadCount} / ${totalReadCount} (${((testedReadCount/totalReadCount)*100).toFixed(1)}%)`);
console.log('====================================================\n');

// Write out reconciled inventory
fs.writeFileSync(
  path.join(__dirname, '../reconciled_route_inventory.json'),
  JSON.stringify({
    summary: {
      totalRoutes: liveRoutes.length,
      totalMutative: totalMutativeCount,
      totalRead: totalReadCount,
      testedRoutes: testedRoutesCount,
      testedMutative: testedMutativeCount,
      testedRead: testedReadCount,
      coveragePercent: Number(((testedRoutesCount/liveRoutes.length)*100).toFixed(1))
    },
    routes: routeDetails
  }, null, 2)
);

console.log('Saved reconciled_route_inventory.json successfully.');
