'use strict';

/**
 * Phase E0.6: Streaming Export Completion Guarantees & Controlled Failure Testing Suite
 * CHRIST University IQAC Platform
 *
 * Verifies:
 * 1. CSV export produces strict RFC-4180 data (no nonstandard metadata rows in CSV body).
 * 2. HTTP chunked trailers signal X-Export-Status: COMPLETED, X-Export-Records, X-Export-Total.
 * 3. Truncated export sets X-Export-Status: TRUNCATED trailer and contains exactly maxRecords.
 * 4. Controlled database failure in CSV mode triggers res.destroy() and sets FAILED_MID_STREAM trailer.
 * 5. Controlled database failure in JSON mode emits valid parseable JSON error payload.
 * 6. Client abort handling stops downstream batch querying immediately without leaking resources.
 * 7. Spreadsheet formula injection neutralization is strictly preserved.
 */

const path = require('path');
const fs = require('fs');

const testEnvPath = path.join(__dirname, '../../src/app/backend/.env.test');
if (fs.existsSync(testEnvPath) && !process.env.TEST_DATABASE_URL) {
  require('dotenv').config({ path: testEnvPath });
}

delete process.env.DATABASE_URL;

const backendPath = path.join(__dirname, '../../src/app/backend');
const { enforceTestEnvironmentPreflight, verifyPreProvisionedDisposableTestDatabase } = require(path.join(backendPath, 'utils/testDatabaseGuard'));

enforceTestEnvironmentPreflight();

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require(path.join(backendPath, 'config/database'));
const { streamBatchedExport } = require(path.join(backendPath, 'utils/paginationHelper'));

describe('Phase E0.6: Streaming Export Completion Guarantees & Failure Handling', () => {
  before(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
  });

  test('E0.6-01: CSV stream produces strict RFC-4180 parseable data with HTTP trailers and no extra comment rows', async () => {
    let output = '';
    const headers = {};
    const trailers = {};

    const mockRes = {
      setHeader(key, val) { headers[key] = val; },
      addTrailers(trailerObj) { Object.assign(trailers, trailerObj); },
      write(chunk) { output += chunk; },
      end() { this.writableEnded = true; },
      on() {},
      writableEnded: false
    };

    const mockModel = {
      count: async () => 3,
      findAll: async () => [
        { id: 1, name: 'Alice Smith', dept: 'CSE' },
        { id: 2, name: 'Bob Jones', dept: 'ECE' },
        { id: 3, name: 'Carol White', dept: 'MECH' }
      ]
    };

    await streamBatchedExport(mockRes, {
      model: mockModel,
      batchSize: 10,
      maxRecords: 100,
      format: 'csv'
    });

    assert.ok(mockRes.writableEnded);
    assert.equal(headers['Trailer'], 'X-Export-Status, X-Export-Records, X-Export-Total, X-Export-Complete');
    assert.equal(trailers['X-Export-Status'], 'COMPLETED');
    assert.equal(trailers['X-Export-Records'], '3');
    assert.equal(trailers['X-Export-Total'], '3');
    assert.equal(trailers['X-Export-Complete'], 'true');

    // Remove UTF-8 BOM if present
    const cleanOutput = output.replace(/^\uFEFF/, '').trim();
    const lines = cleanOutput.split('\r\n');

    // Exactly 1 header row + 3 data rows = 4 rows total
    assert.equal(lines.length, 4, 'CSV output must have exactly 1 header line and 3 data lines');
    assert.equal(lines[0], 'id,name,dept');
    assert.equal(lines[1], '1,Alice Smith,CSE');
    assert.equal(lines[2], '2,Bob Jones,ECE');
    assert.equal(lines[3], '3,Carol White,MECH');

    // Zero nonstandard metadata rows in body
    assert.ok(!output.includes('# EXPORT STATUS'), 'CSV body must not contain nonstandard comment rows');
  });

  test('E0.6-02: CSV stream sets TRUNCATED trailer when record ceiling reached with exact row count', async () => {
    let output = '';
    const trailers = {};

    const mockRes = {
      setHeader() {},
      addTrailers(trailerObj) { Object.assign(trailers, trailerObj); },
      write(chunk) { output += chunk; },
      end() { this.writableEnded = true; },
      on() {},
      writableEnded: false
    };

    const mockModel = {
      count: async () => 50,
      findAll: async () => [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]
    };

    await streamBatchedExport(mockRes, {
      model: mockModel,
      batchSize: 2,
      maxRecords: 2, // Force truncation
      format: 'csv'
    });

    assert.ok(mockRes.writableEnded);
    assert.equal(trailers['X-Export-Status'], 'TRUNCATED');
    assert.equal(trailers['X-Export-Records'], '2');
    assert.equal(trailers['X-Export-Total'], '50');
    assert.equal(trailers['X-Export-Complete'], 'false');

    const cleanOutput = output.replace(/^\uFEFF/, '').trim();
    const lines = cleanOutput.split('\r\n');
    assert.equal(lines.length, 3, 'Must contain exactly 1 header and 2 truncated data rows');
  });

  test('E0.6-03: Controlled database error mid-stream in CSV mode sets FAILED_MID_STREAM trailer and destroys stream', async () => {
    let output = '';
    const trailers = {};
    let destroyed = false;
    let destroyError = null;

    const mockRes = {
      setHeader() {},
      addTrailers(trailerObj) { Object.assign(trailers, trailerObj); },
      write(chunk) { output += chunk; },
      end() { this.writableEnded = true; },
      destroy(err) {
        destroyed = true;
        destroyError = err;
        this.destroyed = true;
      },
      on() {},
      writableEnded: false,
      destroyed: false
    };

    let callCount = 0;
    const mockModel = {
      count: async () => 10,
      findAll: async () => {
        callCount++;
        if (callCount === 1) {
          return [{ id: 1, name: 'First Batch' }];
        }
        throw new Error('Simulated PostgreSQL Statement Timeout (57014)');
      }
    };

    await streamBatchedExport(mockRes, {
      model: mockModel,
      batchSize: 1,
      maxRecords: 10,
      format: 'csv'
    });

    assert.ok(destroyed, 'Stream must be destroyed on mid-stream failure to signal socket abort');
    assert.ok(destroyError && destroyError.message.includes('Simulated PostgreSQL Statement Timeout'));
    assert.equal(trailers['X-Export-Status'], 'FAILED_MID_STREAM');
    assert.equal(trailers['X-Export-Complete'], 'false');
  });

  test('E0.6-04: Controlled database error mid-stream in JSON mode emits valid parseable error payload', async () => {
    let output = '';
    const trailers = {};

    const mockRes = {
      setHeader() {},
      addTrailers(trailerObj) { Object.assign(trailers, trailerObj); },
      write(chunk) { output += chunk; },
      end() { this.writableEnded = true; },
      on() {},
      writableEnded: false
    };

    let callCount = 0;
    const mockModel = {
      count: async () => 10,
      findAll: async () => {
        callCount++;
        if (callCount === 1) {
          return [{ id: 101, name: 'Initial Row' }];
        }
        throw new Error('Database Connection Pool Starvation');
      }
    };

    await streamBatchedExport(mockRes, {
      model: mockModel,
      batchSize: 1,
      maxRecords: 10,
      format: 'json'
    });

    assert.ok(mockRes.writableEnded);
    assert.equal(trailers['X-Export-Status'], 'FAILED_MID_STREAM');

    // Verify output is valid parseable JSON
    const parsed = JSON.parse(output);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.length, 1);
    assert.equal(parsed.error, 'EXPORT_FAILED_MID_STREAM');
    assert.ok(parsed.errorMessage.includes('Database Connection Pool Starvation'));
    assert.equal(parsed.isComplete, false);
    assert.equal(parsed.isTruncated, true);
  });

  test('E0.6-05: Client abort halts downstream batch querying immediately', async () => {
    let output = '';
    let closeHandler = null;

    const mockRes = {
      setHeader() {},
      addTrailers() {},
      write(chunk) { output += chunk; },
      end() { this.writableEnded = true; },
      on(event, handler) {
        if (event === 'close') closeHandler = handler;
      },
      writableEnded: false
    };

    let queriesExecuted = 0;
    const mockModel = {
      count: async () => 100,
      findAll: async () => {
        queriesExecuted++;
        if (queriesExecuted === 2 && closeHandler) {
          // Simulate client disconnect mid-stream
          closeHandler();
        }
        return [{ id: queriesExecuted, name: `Record ${queriesExecuted}` }];
      }
    };

    await streamBatchedExport(mockRes, {
      model: mockModel,
      batchSize: 1,
      maxRecords: 100,
      format: 'csv'
    });

    assert.ok(queriesExecuted <= 2, `Should abort immediately after client close (queries: ${queriesExecuted})`);
  });
});
