'use strict';

/**
 * API Metrics & Performance Telemetry Tracker — CHRIST IQAC Platform
 *
 * Tracks:
 * - Request counts and status distributions
 * - Latency histograms (p50, p95, p99, min, max, average)
 * - Compression bandwidth savings
 * - Database pool utilization (active, idle, waiting)
 * - Error rate percentage
 */

class ApiMetricsTracker {
  constructor() {
    this.totalRequests = 0;
    this.status2xx = 0;
    this.status3xx = 0;
    this.status4xx = 0;
    this.status5xx = 0;
    this.latencies = [];
    this.maxLatencySamples = 2000;
    this.uncompressedBytes = 0;
    this.compressedBytes = 0;
    this.startTime = Date.now();
  }

  recordRequest({ statusCode, durationMs, originalBytes, sentBytes }) {
    this.totalRequests++;

    if (statusCode >= 500) this.status5xx++;
    else if (statusCode >= 400) this.status4xx++;
    else if (statusCode >= 300) this.status3xx++;
    else this.status2xx++;

    if (this.latencies.length >= this.maxLatencySamples) {
      this.latencies.shift();
    }
    this.latencies.push(durationMs);

    if (originalBytes) this.uncompressedBytes += originalBytes;
    if (sentBytes) this.compressedBytes += sentBytes;
  }

  getPercentiles() {
    if (this.latencies.length === 0) {
      return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
    }
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.50)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
    const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);

    return {
      p50,
      p95,
      p99,
      avg,
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }

  getSummary(poolStatus = null) {
    const uptimeSec = Math.round((Date.now() - this.startTime) / 1000);
    const throughput = uptimeSec > 0 ? (this.totalRequests / uptimeSec).toFixed(2) : '0.00';
    const errorRate = this.totalRequests > 0
      ? ((this.status5xx / this.totalRequests) * 100).toFixed(2) + '%'
      : '0.00%';
    const percentiles = this.getPercentiles();

    const compressionSavings = this.uncompressedBytes > 0 && this.compressedBytes > 0
      ? (100 - (this.compressedBytes / this.uncompressedBytes * 100)).toFixed(1) + '%'
      : '0.0%';

    return {
      uptimeSeconds: uptimeSec,
      totalRequests: this.totalRequests,
      throughputReqSec: throughput,
      errorRate,
      statusDistribution: {
        '2xx': this.status2xx,
        '3xx': this.status3xx,
        '4xx': this.status4xx,
        '5xx': this.status5xx
      },
      latencyMs: percentiles,
      compression: {
        uncompressedBytes: this.uncompressedBytes,
        sentBytes: this.compressedBytes,
        savings: compressionSavings
      },
      databasePool: poolStatus || { status: 'Pool metrics unavailable' }
    };
  }
}

const metricsTracker = new ApiMetricsTracker();

/**
 * Express middleware to record request metrics.
 */
function apiMetricsMiddleware(req, res, next) {
  const start = performance.now();

  res.on('finish', () => {
    const durationMs = Math.round(performance.now() - start);
    const contentLength = parseInt(res.getHeader('Content-Length'), 10) || 0;

    metricsTracker.recordRequest({
      statusCode: res.statusCode,
      durationMs,
      originalBytes: contentLength,
      sentBytes: contentLength
    });
  });

  next();
}

module.exports = {
  metricsTracker,
  apiMetricsMiddleware
};
