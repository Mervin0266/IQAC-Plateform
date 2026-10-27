'use strict';

const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '../route_inventory_detailed.json');
const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const inventory = inventoryData.routes || [];

console.log('Total routes in inventory:', inventory.length);

const byMethod = {};
const riskCategories = {
  HIGH_PII_MUTATIVE: [],     // Mutative routes, destructive, approvals, bulk uploads, PII modifications
  HIGH_SENSITIVE_READ: [],   // Exports, downloads, analytics, audit logs, faculty/student personal records
  MEDIUM_OPERATIONAL: [],    // Department filtering, item retrieval, status updates
  LOW_READ_LOOKUP: []        // Dropdowns, departments list, lookup tables, static configurations
};

inventory.forEach(r => {
  byMethod[r.method] = (byMethod[r.method] || 0) + 1;

  const isMutative = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(r.method);
  const pathLower = r.endpoint.toLowerCase();

  if (isMutative || pathLower.includes('clear') || pathLower.includes('approve') || pathLower.includes('reject') || pathLower.includes('upload')) {
    riskCategories.HIGH_PII_MUTATIVE.push(r);
  } else if (pathLower.includes('export') || pathLower.includes('download') || pathLower.includes('analytics') || pathLower.includes('audit') || pathLower.includes('report') || pathLower.includes('student') || pathLower.includes('faculty')) {
    riskCategories.HIGH_SENSITIVE_READ.push(r);
  } else if (pathLower.includes(':id') || pathLower.includes('search') || pathLower.includes('filter')) {
    riskCategories.MEDIUM_OPERATIONAL.push(r);
  } else {
    riskCategories.LOW_READ_LOOKUP.push(r);
  }
});

console.log('Methods breakdown:', byMethod);
console.log('Risk Breakdown:');
console.log('- HIGH_PII_MUTATIVE:', riskCategories.HIGH_PII_MUTATIVE.length);
console.log('- HIGH_SENSITIVE_READ:', riskCategories.HIGH_SENSITIVE_READ.length);
console.log('- MEDIUM_OPERATIONAL:', riskCategories.MEDIUM_OPERATIONAL.length);
console.log('- LOW_READ_LOOKUP:', riskCategories.LOW_READ_LOOKUP.length);

// Check behavioral test coverage
const testedRoutes = inventory.filter(r => r.behaviorallyTested);
console.log('\nReported Behaviorally Tested:', testedRoutes.length);
console.log('Reported Untested:', inventory.length - testedRoutes.length);
