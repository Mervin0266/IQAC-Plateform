'use strict';

const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '../route_inventory_detailed.json');
const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const routes = inventoryData.routes || [];

const tested = routes.filter(r => r.behaviorallyTested);
const untested = routes.filter(r => !r.behaviorallyTested);

console.log(`Total Routes: ${routes.length}`);
console.log(`Tested Routes: ${tested.length}`);
console.log(`Untested Routes: ${untested.length}`);

const classified = {
  CRITICAL_MUTATIVE: [],   // POST, PUT, DELETE, PATCH that aren't tested yet
  SENSITIVE_READ: [],      // PII, analytics, exports, audit logs
  OPERATIONAL_READ: [],    // Scoped list queries with :id or params
  LOOKUP_ENUM_READ: []     // Static dropdown options, masters, schema lookups
};

untested.forEach(r => {
  const isMut = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(r.method);
  const p = r.endpoint.toLowerCase();

  if (isMut) {
    classified.CRITICAL_MUTATIVE.push(r);
  } else if (p.includes('export') || p.includes('download') || p.includes('analytics') || p.includes('audit') || p.includes('report') || p.includes('faculty') || p.includes('student')) {
    classified.SENSITIVE_READ.push(r);
  } else if (p.includes(':id') || p.includes('search') || p.includes('filter')) {
    classified.OPERATIONAL_READ.push(r);
  } else {
    classified.LOOKUP_ENUM_READ.push(r);
  }
});

console.log('\n--- UNTESTED ROUTES RISK CLASSIFICATION ---');
console.log(`1. Critical Mutative Routes: ${classified.CRITICAL_MUTATIVE.length}`);
classified.CRITICAL_MUTATIVE.forEach(r => console.log(`   [${r.method}] ${r.endpoint}`));

console.log(`\n2. Sensitive Read Routes (PII/Exports/Reports): ${classified.SENSITIVE_READ.length}`);
classified.SENSITIVE_READ.forEach(r => console.log(`   [${r.method}] ${r.endpoint}`));

console.log(`\n3. Operational Entity Read Routes: ${classified.OPERATIONAL_READ.length}`);
classified.OPERATIONAL_READ.slice(0, 10).forEach(r => console.log(`   [${r.method}] ${r.endpoint}`));
if (classified.OPERATIONAL_READ.length > 10) console.log(`   ... and ${classified.OPERATIONAL_READ.length - 10} more`);

console.log(`\n4. Lookup / Enum / Master Metadata Reads: ${classified.LOOKUP_ENUM_READ.length}`);
classified.LOOKUP_ENUM_READ.slice(0, 10).forEach(r => console.log(`   [${r.method}] ${r.endpoint}`));
if (classified.LOOKUP_ENUM_READ.length > 10) console.log(`   ... and ${classified.LOOKUP_ENUM_READ.length - 10} more`);
