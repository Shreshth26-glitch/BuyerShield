import { SyncService } from '../services/SyncService.js';
import { query } from '../db/index.js';

export const AdminSyncController = {
  // GET /api/admin/sync/jobs
  async getJobs(req, res, next) {
    try {
      const { limit = 50, offset = 0, state, status } = req.query;
      const data = await SyncService.getRecentJobs({
        limit: parseInt(limit, 10) || 50,
        offset: parseInt(offset, 10) || 0,
        state,
        status,
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/sync/stats
  async getStats(req, res, next) {
    try {
      const stats = await SyncService.getAggregateStats();
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/admin/sync/retry/:jobId
  async retryJob(req, res, next) {
    try {
      const jobId = parseInt(req.params.jobId, 10);
      if (isNaN(jobId)) {
        return res.status(400).json({ success: false, error: 'Invalid jobId parameter.' });
      }

      const jobRes = await query('SELECT * FROM sync_jobs WHERE id = $1', [jobId]);
      const job = jobRes.rows[0];

      if (!job) {
        return res.status(404).json({ success: false, error: 'Sync job not found.' });
      }

      if (!job.project_id) {
        return res.status(400).json({
          success: false,
          error: 'This sync job has no associated project_id to retry.',
        });
      }

      const result = await SyncService.syncProject(job.project_id, {
        triggeredBy: `admin_retry_job_${jobId}`,
      });

      return res.status(200).json({
        success: true,
        message: result.success ? 'Job retried and sync succeeded.' : 'Job retried but sync failed.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
