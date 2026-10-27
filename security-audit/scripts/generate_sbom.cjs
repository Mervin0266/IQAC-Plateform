'use strict';

/**
 * Phase E5: Comprehensive Software Bill of Materials (SBOM) Generator
 * CHRIST University IQAC Platform
 *
 * Produces an industry-standard CycloneDX 1.5 JSON SBOM covering both:
 * 1. Direct and transitive backend runtime & development dependencies (from package-lock.json).
 * 2. Direct and transitive frontend bundle & build-time dependencies (from pnpm-lock.yaml).
 *
 * Each component contains:
 * - name, version, purl
 * - scope (required vs optional)
 * - hashes (SHA-512 from lockfiles where available)
 * - license information
 * - custom properties categorizing environment target:
 *   - backend-runtime (production backend container)
 *   - backend-dev (local/test backend tooling)
 *   - frontend-bundle (shipped to browser)
 *   - frontend-build (build-time tooling)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const backendLockPath = path.join(__dirname, '../../src/app/backend/package-lock.json');
const pnpmLockPath = path.join(__dirname, '../../pnpm-lock.yaml');
const rootPkgPath = path.join(__dirname, '../../package.json');
const backendPkgPath = path.join(__dirname, '../../src/app/backend/package.json');

const rootPkg = require(rootPkgPath);
const backendPkg = require(backendPkgPath);
const backendLock = JSON.parse(fs.readFileSync(backendLockPath, 'utf8'));

const componentMap = new Map();

function addComponent({ name, version, scope, target, integrity, license, direct = false }) {
  if (!name || !version) return;
  const key = `${name}@${version}`;
  if (componentMap.has(key)) {
    // If already present, upgrade target/scope if direct
    const existing = componentMap.get(key);
    if (direct) {
      existing.properties.find(p => p.name === 'iqac:isDirectDependency').value = 'true';
    }
    return;
  }

  const hashes = [];
  if (integrity && integrity.startsWith('sha512-')) {
    hashes.push({
      alg: 'SHA-512',
      content: integrity.replace('sha512-', '')
    });
  }

  const purl = `pkg:npm/${name.startsWith('@') ? encodeURIComponent(name) : name}@${version}`;

  const comp = {
    type: 'library',
    name,
    version,
    scope: scope === 'dev' ? 'optional' : 'required',
    purl,
    properties: [
      { name: 'iqac:environmentTarget', value: target },
      { name: 'iqac:isDirectDependency', value: String(direct) }
    ]
  };

  if (hashes.length > 0) {
    comp.hashes = hashes;
  }
  if (license) {
    comp.licenses = [{ license: { id: license } }];
  }

  componentMap.set(key, comp);
}

// 1. Process Backend Dependencies from package-lock.json
if (backendLock.packages) {
  for (const [pkgPath, meta] of Object.entries(backendLock.packages)) {
    if (!pkgPath || pkgPath === '') continue; // Skip root package itself
    const parts = pkgPath.split('node_modules/');
    const name = parts[parts.length - 1];
    const version = meta.version;
    const isDev = Boolean(meta.dev);
    const integrity = meta.integrity;
    const license = meta.license;

    const isDirect = Boolean(
      (backendPkg.dependencies && backendPkg.dependencies[name]) ||
      (backendPkg.devDependencies && backendPkg.devDependencies[name])
    );

    addComponent({
      name,
      version,
      scope: isDev ? 'dev' : 'prod',
      target: isDev ? 'backend-dev' : 'backend-runtime',
      integrity,
      license,
      direct: isDirect
    });
  }
}

// 2. Process Frontend Dependencies from pnpm-lock.yaml
if (fs.existsSync(pnpmLockPath)) {
  const pnpmContent = fs.readFileSync(pnpmLockPath, 'utf8');
  // Simple robust parser for pnpm snapshots: lines matching "  package@version:" or "package@version:"
  const snapshotRegex = /^\s{2}'?(@?[a-zA-Z0-9._\-\/]+)@([0-9a-zA-Z._\-+]+)(?:\(.*?\))?'?:/gm;
  let match;
  while ((match = snapshotRegex.exec(pnpmContent)) !== null) {
    const name = match[1];
    let version = match[2];
    if (version.includes('(')) {
      version = version.split('(')[0];
    }

    const isDirectProd = Boolean(rootPkg.dependencies && rootPkg.dependencies[name]);
    const isDirectDev = Boolean(rootPkg.devDependencies && rootPkg.devDependencies[name]);
    const isDirect = isDirectProd || isDirectDev;

    // Distinguish build-only vs browser-bundle
    const isBuildTool = name.includes('vite') || name.includes('eslint') || name.includes('tailwind') ||
                        name.includes('postcss') || name.includes('typescript') || isDirectDev;

    addComponent({
      name,
      version,
      scope: isBuildTool ? 'dev' : 'prod',
      target: isBuildTool ? 'frontend-build' : 'frontend-bundle',
      direct: isDirect
    });
  }
}

const components = Array.from(componentMap.values());

const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: `urn:uuid:${crypto.randomUUID()}`,
  version: 2,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: [
      {
        vendor: 'CHRIST University IQAC DevSecOps',
        name: 'iqac-sbom-generator',
        version: '2.0.0'
      }
    ],
    component: {
      type: 'application',
      name: 'christ-university-iqac-platform',
      version: '1.0.0',
      description: 'Internal Quality Assurance Cell (IQAC) Accreditation & Compliance Platform',
      licenses: [{ license: { id: 'Proprietary' } }]
    }
  },
  components
};

const outputPath = path.join(__dirname, '../sbom.json');
fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2));

console.log('========================================================================');
console.log('CHRIST UNIVERSITY IQAC — PHASE E5 COMPLETE CYCLONEDX 1.5 SBOM GENERATOR');
console.log('========================================================================');
console.log(`Total Resolved Components: ${components.length}`);

// Categorize breakdown
const breakdown = {
  'backend-runtime': 0,
  'backend-dev': 0,
  'frontend-bundle': 0,
  'frontend-build': 0
};

let directCount = 0;
for (const c of components) {
  const target = c.properties.find(p => p.name === 'iqac:environmentTarget')?.value;
  const isDirect = c.properties.find(p => p.name === 'iqac:isDirectDependency')?.value === 'true';
  if (target && breakdown[target] !== undefined) breakdown[target]++;
  if (isDirect) directCount++;
}

console.log(`- Direct Dependencies:      ${directCount}`);
console.log(`- Transitive Dependencies:  ${components.length - directCount}`);
console.log(`- Backend Runtime:          ${breakdown['backend-runtime']}`);
console.log(`- Backend Dev/Test:         ${breakdown['backend-dev']}`);
console.log(`- Frontend Browser Bundle:  ${breakdown['frontend-bundle']}`);
console.log(`- Frontend Build Tooling:   ${breakdown['frontend-build']}`);
console.log(`\nSaved CycloneDX 1.5 SBOM to: ${outputPath}`);
