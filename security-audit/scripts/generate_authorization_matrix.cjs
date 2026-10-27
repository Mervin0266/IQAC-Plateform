'use strict';

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../../src/app/backend/routes');
const routerFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

const routesInventory = [];

routerFiles.forEach(file => {
  const filePath = path.join(routesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const baseName = file.replace('.js', '');

  // Determine mount path from server.js conventions
  let mountPrefix = '/api/' + baseName.replace(/([A-Z])/g, '-$1').toLowerCase();
  if (baseName === 'auth') mountPrefix = '/api/auth';
  if (baseName === 'strategicPlans') mountPrefix = '/api/strategic-plans';
  if (baseName === 'editRequests') mountPrefix = '/api/edit-requests';
  if (baseName === 'researchMetrics') mountPrefix = '/api/research-metrics';
  if (baseName === 'sponsoredProjects') mountPrefix = '/api/sponsored-projects';
  if (baseName === 'consultancyProjects') mountPrefix = '/api/consultancy-projects';
  if (baseName === 'departmentalActivities') mountPrefix = '/api/departmental-activities';
  if (baseName === 'parameterMaster') mountPrefix = '/api/parameter-master';
  if (baseName === 'departmentLineage') mountPrefix = '/api/department-lineage';
  if (baseName === 'programLevels') mountPrefix = '/api/program-levels';

  // Parse router definitions
  // Matches router.get('/', ...), router.route('/...').get(...).post(...)
  const lines = content.split('\n');
  let currentRoute = null;

  lines.forEach((line, idx) => {
    // Check router.use(protect) at top level
    // router.(get|post|put|delete|patch)('path', middlewares, handler)
    const match = line.match(/router\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/i);
    if (match) {
      const method = match[1].toUpperCase();
      const subPath = match[2];
      const fullPath = (mountPrefix + (subPath === '/' ? '' : subPath)).replace(/\/+/g, '/');

      // Check middleware in that line and following lines
      const windowText = lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 5)).join(' ');
      const hasProtect = windowText.includes('protect') || content.includes('router.use(protect)');
      
      let roles = 'All Authenticated Roles';
      const roleMatch = windowText.match(/authorize\(([^)]+)\)/);
      if (roleMatch) {
        roles = roleMatch[1].replace(/['"]/g, '').split(',').map(s => s.trim()).join(', ');
      } else if (!hasProtect) {
        roles = 'Public / Unauthenticated';
      }

      let deptScope = 'Global / Admin-only';
      if (windowText.includes('department') || content.includes('department') || content.includes('scopeHelper') || content.includes('resolveDepartmentScope')) {
        deptScope = 'Scoped to user.department for Non-Admin/Authority';
      }

      let ownership = 'Role-Based';
      if (windowText.includes('ownership') || content.includes('createdBy') || content.includes('uploadedBy')) {
        ownership = 'Enforced (Faculty can only modify/delete own records)';
      }

      routesInventory.push({
        file,
        method,
        path: fullPath,
        authRequired: hasProtect,
        roles,
        deptScope,
        ownership
      });
    }
  });
});

console.log(`Parsed ${routesInventory.length} route endpoints from ${routerFiles.length} router files.`);
fs.writeFileSync(
  path.join(__dirname, 'analyzed_routes.json'),
  JSON.stringify(routesInventory, null, 2)
);
console.log('Saved analyzed routes to analyzed_routes.json');
