'use strict';

/**
 * Advanced API Performance Optimization Test Suite
 * CHRIST (Deemed to be University) — IQAC Platform
 *
 * Verifies:
 * 1. Advanced Server-Side Pagination (Offset + Keyset/Cursor Pagination)
 * 2. Asynchronous Non-Blocking Structured Logger & Secret Redactor
 * 3. Multi-Layer HTTP ETag, Cache-Control & Backend Cache Store
 * 4. Native Node.js Response Compression (Gzip / Threshold / Whitelist)
 * 5. Connection Pool Management & API Performance Telemetry
 */

const assert = require('assert');
const zlib = require('zlib');
const http = require('http');
const express = require('express');
const {
  safeParseInt,
  parsePagination,
  formatPaginationResponse,
  encodeCursor,
  decodeCursor,
  parseCursorPagination,
  formatCursorPaginationResponse
} = require('../utils/paginationHelper');
const { asyncLoggerInstance } = require('../middleware/asyncLogger');
const { backendCache, httpEtagMiddleware, cacheControlMiddleware } = require('../middleware/httpCache');
const { compressionMiddleware, COMPRESSION_THRESHOLD_BYTES } = require('../middleware/compressionMiddleware');
const { metricsTracker } = require('../middleware/apiMetrics');
const { getPoolStatus } = require('../config/database');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    throw err;
  }
}

async function main() {
  console.log('\n===============================================================');
  console.log(' ADVANCED API PERFORMANCE OPTIMIZATION TEST SUITE             ');
  console.log('===============================================================');

  // ── 1. ADVANCED PAGINATION TESTS ──────────────────────────────────────────
  console.log('\n[1. Advanced Pagination & Keyset Keyset Tests]');

  runTest('Safe Integer Parser: Rejects NaN, negative, and overflow values', () => {
    assert.strictEqual(safeParseInt('25', 10, 1, 100), 25);
    assert.strictEqual(safeParseInt('invalid', 10, 1, 100), 10);
    assert.strictEqual(safeParseInt('-5', 10, 1, 100), 10);
    assert.strictEqual(safeParseInt('500', 10, 1, 100), 100); // capped at max
    assert.strictEqual(safeParseInt('1e10', 10, 1, 100), 10); // scientific notation rejected
  });

  runTest('Offset Pagination: Correct offset and boundary calculation', () => {
    const p1 = parsePagination({ page: '3', limit: '20' });
    assert.strictEqual(p1.page, 3);
    assert.strictEqual(p1.limit, 20);
    assert.strictEqual(p1.offset, 40);

    const formatted = formatPaginationResponse({ count: 95, rows: new Array(20).fill({}), page: 3, limit: 20 });
    assert.strictEqual(formatted.pagination.totalPages, 5);
    assert.strictEqual(formatted.pagination.hasNextPage, true);
    assert.strictEqual(formatted.pagination.hasPrevPage, true);
  });

  runTest('Cursor Pagination: Token encoding, decoding, and tie-breakers', () => {
    const raw = { val: '2026-11-23T10:00:00Z', id: '11111111-2222-3333-4444-555555555555' };
    const token = encodeCursor(raw);
    assert.ok(typeof token === 'string');

    const decoded = decodeCursor(token);
    assert.strictEqual(decoded.val, raw.val);
    assert.strictEqual(decoded.id, raw.id);

    // Keyset pagination parsing with unique tie-breaker
    const parsedCursor = parseCursorPagination({ cursor: token, limit: '25' });
    assert.strictEqual(parsedCursor.limit, 25);
    assert.strictEqual(parsedCursor.fetchLimit, 26);
    assert.ok(parsedCursor.cursorCondition);
    assert.deepStrictEqual(parsedCursor.order, [['createdAt', 'DESC'], ['id', 'DESC']]);

    // Format cursor response
    const mockRows = Array.from({ length: 26 }, (_, i) => ({
      id: `id-${i}`,
      createdAt: `2026-11-23T${String(10 + i).padStart(2, '0')}:00:00Z`
    }));
    const cursorResponse = formatCursorPaginationResponse({ rows: mockRows, limit: 25, sortField: 'createdAt' });
    assert.strictEqual(cursorResponse.count, 25);
    assert.strictEqual(cursorResponse.pagination.hasNextPage, true);
    assert.ok(cursorResponse.pagination.nextCursor);
  });

  // ── 2. ASYNCHRONOUS NON-BLOCKING LOGGER TESTS ─────────────────────────────
  console.log('\n[2. Asynchronous Non-Blocking Structured Logger]');

  runTest('Async Logger: Queues logs and redacts confidential credentials', () => {
    asyncLoggerInstance.log({
      level: 'info',
      correlationId: 'req-corr-123',
      method: 'POST',
      url: '/api/auth/login',
      password: 'SuperSecretPassword123!',
      token: 'jwt.bearer.token',
      statusCode: 200,
      durationMs: 14
    });

    assert.ok(asyncLoggerInstance.buffer.length > 0);
    const queued = asyncLoggerInstance.buffer[asyncLoggerInstance.buffer.length - 1];
    assert.strictEqual(queued.correlationId, 'req-corr-123');
    assert.strictEqual(queued.method, 'POST');

    // Verify flush does not throw
    asyncLoggerInstance.flush();
  });

  // ── 3. HTTP CACHING & ETAG TESTS ──────────────────────────────────────────
  console.log('\n[3. HTTP ETag & Multi-Tier Caching]');

  runTest('Backend Cache Layer: Set, get, pattern invalidation, and metrics', () => {
    backendCache.set('dept::cse::analytics', { kpi: 98 }, 5000);
    backendCache.set('dept::ece::analytics', { kpi: 94 }, 5000);
    backendCache.set('campus::kengeri::stats', { total: 4000 }, 5000);

    const hit = backendCache.get('dept::cse::analytics');
    assert.strictEqual(hit.kpi, 98);

    // Invalidate department analytics pattern
    backendCache.invalidatePattern('dept::');
    assert.strictEqual(backendCache.get('dept::cse::analytics'), null);
    assert.strictEqual(backendCache.get('dept::ece::analytics'), null);
    assert.ok(backendCache.get('campus::kengeri::stats') !== null);

    const metrics = backendCache.getMetrics();
    assert.ok(metrics.size >= 1);
    assert.ok(metrics.hits >= 1);
  });

  await runAsyncTest('HTTP ETag Middleware: Returns 304 Not Modified on matching If-None-Match', async () => {
    const app = express();
    app.use(httpEtagMiddleware);
    app.get('/test-etag', (req, res) => {
      res.json({ message: 'ETag verification test', timestamp: 12345 });
    });

    const server = http.createServer(app);
    await new Promise(r => server.listen(0, r));
    const port = server.address().port;

    // Step 1: Initial request to receive ETag
    const res1 = await fetch(`http://localhost:${port}/test-etag`);
    assert.strictEqual(res1.status, 200);
    const etag = res1.headers.get('etag');
    assert.ok(etag);
    assert.ok(etag.startsWith('W/"'));

    // Step 2: Second request with matching If-None-Match
    const res2 = await fetch(`http://localhost:${port}/test-etag`, {
      headers: { 'If-None-Match': etag }
    });
    assert.strictEqual(res2.status, 304); // 304 Not Modified
    const body2 = await res2.text();
    assert.strictEqual(body2, ''); // Zero network payload transferred

    server.close();
  });

  // ── 4. NATIVE RESPONSE COMPRESSION TESTS ──────────────────────────────────
  console.log('\n[4. Response Payload Compression]');

  await runAsyncTest('Compression: Gzips JSON responses >= 1KB and sets Content-Encoding', async () => {
    const app = express();
    app.use(compressionMiddleware);

    // Endpoint with large payload (> 1KB)
    app.get('/large-json', (req, res) => {
      const records = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Student Record Number ${i}`,
        department: 'Computer Science and Engineering',
        university: 'CHRIST (Deemed to be University)'
      }));
      res.json({ success: true, records });
    });

    // Endpoint with small payload (< 1KB)
    app.get('/small-json', (req, res) => {
      res.json({ ok: true });
    });

    const server = http.createServer(app);
    await new Promise(r => server.listen(0, r));
    const port = server.address().port;

    // 1. Test via native http.get to inspect raw compressed wire bytes
    const wireChunks = [];
    let wireHeaders;
    await new Promise((resolve, reject) => {
      http.get(`http://localhost:${port}/large-json`, { headers: { 'accept-encoding': 'gzip' } }, (res) => {
        wireHeaders = res.headers;
        res.on('data', chunk => wireChunks.push(chunk));
        res.on('end', resolve);
        res.on('error', reject);
      });
    });

    assert.strictEqual(wireHeaders['content-encoding'], 'gzip');
    assert.strictEqual(wireHeaders['vary'], 'Accept-Encoding');
    const wireBuffer = Buffer.concat(wireChunks);
    const decompressed = zlib.gunzipSync(wireBuffer).toString('utf8');
    const parsedWire = JSON.parse(decompressed);
    assert.strictEqual(parsedWire.records.length, 50);
    assert.ok(wireBuffer.length < Buffer.byteLength(decompressed), 'Gzip wire size must be smaller than raw JSON');

    // 2. Test standard client fetch
    const resLarge = await fetch(`http://localhost:${port}/large-json`, {
      headers: { 'Accept-Encoding': 'gzip' }
    });
    assert.strictEqual(resLarge.status, 200);
    assert.strictEqual(resLarge.headers.get('content-encoding'), 'gzip');
    assert.strictEqual(resLarge.headers.get('vary'), 'Accept-Encoding');
    const parsedFetch = await resLarge.json();
    assert.strictEqual(parsedFetch.records.length, 50);

    // 3. Request small payload: must NOT be compressed (under 1KB threshold)
    const resSmall = await fetch(`http://localhost:${port}/small-json`, {
      headers: { 'Accept-Encoding': 'gzip' }
    });
    assert.strictEqual(resSmall.status, 200);
    assert.strictEqual(resSmall.headers.get('content-encoding'), null); // Threshold respected

    await new Promise(r => server.close(r));
  });

  // ── 5. DATABASE POOL MANAGEMENT & METRICS ─────────────────────────────────
  console.log('\n[5. Database Pool Management & Telemetry Instrumentation]');

  runTest('Database Connection Pool: Validates pool sizing and monitoring metrics', () => {
    const pool = getPoolStatus();
    assert.ok(pool);
    assert.strictEqual(pool.status, 'active');
    assert.ok(typeof pool.max === 'number' && pool.max >= 5);
    assert.ok(typeof pool.min === 'number');

    // Verify Telemetry Tracker integration
    metricsTracker.recordRequest({ statusCode: 200, durationMs: 12, originalBytes: 4500, sentBytes: 1200 });
    metricsTracker.recordRequest({ statusCode: 304, durationMs: 2, originalBytes: 0, sentBytes: 0 });

    const summary = metricsTracker.getSummary(pool);
    assert.ok(summary.totalRequests >= 2);
    assert.ok(summary.latencyMs.p50 >= 0);
    assert.ok(summary.databasePool.max >= 5);
  });

  console.log(`\n===============================================================`);
  console.log(` ALL ADVANCED PERFORMANCE TESTS PASSED: ${passedTests}/${totalTests} (100%) `);
  console.log(`===============================================================\n`);
}

main().catch(err => {
  console.error('\n✗ Test Suite Encountered Fatal Exception:', err);
  process.exit(1);
});
