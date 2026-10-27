'use strict';

const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/iqac_test';

const app = require('../../src/app/backend/server');

function getRoutesFromApp(app) {
  const routes = [];

  function print(mountPath, layer) {
    if (layer.route) {
      layer.route.stack.forEach((subLayer) => {
        const method = subLayer.method ? subLayer.method.toUpperCase() : 'ALL';
        routes.push({
          method,
          path: (mountPath + layer.route.path).replace(/\/+/g, '/'),
          handleName: subLayer.name || 'anonymous'
        });
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
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
        print(routerPath, subLayer);
      });
    }
  }

  app._router.stack.forEach((layer) => {
    print('', layer);
  });

  return routes;
}

try {
  const extracted = getRoutesFromApp(app);
  const seen = new Set();
  const unique = [];
  extracted.forEach(r => {
    const key = `${r.method} ${r.path}`;
    if (!seen.has(key) && !r.path.includes('*') && r.path !== '/') {
      seen.add(key);
      unique.push(r);
    }
  });

  console.log(`Total unique API routes found: ${unique.length}`);
  fs.writeFileSync(
    path.join(__dirname, 'extracted_routes.json'),
    JSON.stringify(unique, null, 2)
  );
  console.log('Saved to extracted_routes.json');
} catch (err) {
  console.error('Route extraction failed:', err);
  process.exit(1);
}
