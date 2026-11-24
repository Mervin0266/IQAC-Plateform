'use strict';

/**
 * Job Controller — CHRIST (Deemed to be University) IQAC Platform
 * Handles job submission, status polling, listing, and cancellation.
 */

const jobQueueService = require('../services/jobQueueService');
const { resolveDepartmentScope } = require('../utils/scopeHelper');

/**
 * Enqueue an asynchronous report generation job.
 * POST /api/jobs/report-export
 */
exports.enqueueReportJob = async (req, res) => {
  try {
    const { reportType, format, filters = {} } = req.body;
    let userScope = {};

    try {
      userScope = await resolveDepartmentScope(req, 'Department', false);
    } catch (e) {
      userScope = {};
    }

    const job = jobQueueService.enqueueJob({
      type: 'REPORT_EXPORT',
      payload: {
        reportType: reportType || 'Institutional Complete Report',
        format: (format || 'pdf').toLowerCase(),
        filters,
        userScope
      },
      requestedBy: req.user,
      userScope,
      priority: 7
    });

    return res.status(202).json({
      success: true,
      message: 'Report export job accepted and scheduled for background execution.',
      jobId: job.jobId,
      status: job.status,
      createdAt: job.createdAt
    });
  } catch (err) {
    console.error('[JobController] Error enqueuing report job:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to enqueue report job.'
    });
  }
};

/**
 * Get the status and progress of a background job.
 * GET /api/jobs/:id
 */
exports.getJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const job = jobQueueService.getJob(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.'
      });
    }

    // Authorization check: non-admins can only view their own jobs
    if (!req.user.isSystemAdmin && job.requestedBy?.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You cannot inspect jobs requested by other users.'
      });
    }

    return res.json({
      success: true,
      data: {
        jobId: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        stageMessage: job.stageMessage,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        retryCount: job.retryCount,
        resultData: job.resultData,
        errorDetails: job.errorDetails
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch job status.'
    });
  }
};

/**
 * List background jobs requested by user or all jobs if admin.
 * GET /api/jobs
 */
exports.listJobs = async (req, res) => {
  try {
    const isSystemAdmin = req.user.isSystemAdmin;
    const filterUserId = isSystemAdmin ? (req.query.userId || null) : req.user.id;
    const status = req.query.status || null;
    const type = req.query.type || null;
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 25);

    const jobs = jobQueueService.listJobs({
      userId: filterUserId,
      status,
      type,
      limit
    });

    return res.json({
      success: true,
      data: jobs.map(j => ({
        jobId: j.id,
        type: j.type,
        status: j.status,
        progress: j.progress,
        stageMessage: j.stageMessage,
        createdAt: j.createdAt,
        completedAt: j.completedAt
      }))
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to list jobs.'
    });
  }
};

/**
 * Cancel a pending background job.
 * POST /api/jobs/:id/cancel
 */
exports.cancelJob = async (req, res) => {
  try {
    const { id } = req.params;
    const result = jobQueueService.cancelJob(id, req.user);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to cancel job.'
    });
  }
};
