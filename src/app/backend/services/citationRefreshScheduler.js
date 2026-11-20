'use strict';

const { refreshDueCitations, refreshDueJournalMetrics } = require('./scopusService');

let isRefreshingCitations = false;
let isRefreshingJournals = false;
let citationTimer = null;
let journalTimer = null;
let lastCitationRunSummary = null;
let lastJournalRunSummary = null;

// Hourly check for due publication citations
const CITATION_CHECK_INTERVAL_MS = 60 * 60 * 1000;
// Check every 6 hours for due journal metrics (monthly cadence per source)
const JOURNAL_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Executes a publication citation refresh sweep for eligible/due publications.
 * Concurrency-safe and idempotent.
 */
async function executeCitationRefreshSweep(batchLimit = 50) {
  if (isRefreshingCitations) {
    console.log('[CitationScheduler] A publication citation refresh sweep is already in progress. Skipping overlapping run.');
    return {
      running: true,
      message: 'A citation refresh sweep is currently in progress.'
    };
  }

  isRefreshingCitations = true;
  try {
    const summary = await refreshDueCitations(batchLimit);
    lastCitationRunSummary = {
      ...summary,
      executedAt: new Date().toISOString()
    };
    return lastCitationRunSummary;
  } catch (err) {
    console.error('[CitationScheduler] Unhandled error during citation refresh sweep:', err.message);
    lastCitationRunSummary = {
      success: false,
      error: err.message,
      executedAt: new Date().toISOString()
    };
    return lastCitationRunSummary;
  } finally {
    isRefreshingCitations = false;
  }
}

/**
 * Executes a monthly journal metrics refresh sweep for due shared ScopusSource records.
 */
async function executeJournalMetricsRefreshSweep(batchLimit = 25) {
  if (isRefreshingJournals) {
    console.log('[JournalScheduler] A journal metrics refresh sweep is already in progress. Skipping overlapping run.');
    return {
      running: true,
      message: 'A journal metrics refresh sweep is currently in progress.'
    };
  }

  isRefreshingJournals = true;
  try {
    const summary = await refreshDueJournalMetrics(batchLimit);
    lastJournalRunSummary = {
      ...summary,
      executedAt: new Date().toISOString()
    };
    return lastJournalRunSummary;
  } catch (err) {
    console.error('[JournalScheduler] Error during journal metrics refresh sweep:', err.message);
    lastJournalRunSummary = {
      success: false,
      error: err.message,
      executedAt: new Date().toISOString()
    };
    return lastJournalRunSummary;
  } finally {
    isRefreshingJournals = false;
  }
}

/**
 * Initializes the background schedulers for Scopus Weekly Citations and Monthly Journal Metrics.
 */
function initCitationScheduler() {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  console.log('[CitationScheduler] Initializing Scopus Weekly Citation & Monthly Journal Metrics Schedulers...');

  // Run initial citation check 30 seconds after server startup
  setTimeout(() => {
    executeCitationRefreshSweep(30).catch(err => {
      console.warn('[CitationScheduler] Initial boot citation sweep warning:', err.message);
    });
    executeJournalMetricsRefreshSweep(15).catch(err => {
      console.warn('[JournalScheduler] Initial boot journal sweep warning:', err.message);
    });
  }, 30000);

  // Periodic hourly check for due publication citations
  if (!citationTimer) {
    citationTimer = setInterval(() => {
      executeCitationRefreshSweep(50).catch(err => {
        console.warn('[CitationScheduler] Scheduled citation sweep warning:', err.message);
      });
    }, CITATION_CHECK_INTERVAL_MS);
  }

  // Periodic check for due journal metrics
  if (!journalTimer) {
    journalTimer = setInterval(() => {
      executeJournalMetricsRefreshSweep(25).catch(err => {
        console.warn('[JournalScheduler] Scheduled journal sweep warning:', err.message);
      });
    }, JOURNAL_CHECK_INTERVAL_MS);
  }
}

function stopCitationScheduler() {
  if (citationTimer) {
    clearInterval(citationTimer);
    citationTimer = null;
  }
  if (journalTimer) {
    clearInterval(journalTimer);
    journalTimer = null;
  }
}

function getSchedulerStatus() {
  return {
    citationScheduler: {
      isRunning: isRefreshingCitations,
      intervalHours: 1,
      lastRun: lastCitationRunSummary
    },
    journalScheduler: {
      isRunning: isRefreshingJournals,
      intervalHours: 6,
      lastRun: lastJournalRunSummary
    }
  };
}

module.exports = {
  initCitationScheduler,
  stopCitationScheduler,
  executeCitationRefreshSweep,
  executeJournalMetricsRefreshSweep,
  getSchedulerStatus
};
