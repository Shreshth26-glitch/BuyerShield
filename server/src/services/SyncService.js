import { query } from '../db/index.js';
import { ProjectModel } from '../models/projectModel.js';
import {
  getAdapterForState,
  TransientSyncError,
  StructuralSyncError,
  ProjectNotFoundError,
} from '../adapters/index.js';

// Cooldown map for user on-demand sync: key = `${userId}:${projectId}` -> timestamp
const manualSyncCooldowns = new Map();
const MANUAL_SYNC_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

const formatDateOnly = (d) => {
  if (!d) return null;
  if (typeof d === 'string') return d.substring(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export class SyncService {
  /**
   * Sync a single project against its state RERA portal with full retry and reconciliation handling.
   * @param {number} projectId
   * @param {Object} [options]
   * @param {string} [options.triggeredBy='system'] - 'system', 'scheduler', 'manual_user', 'admin_retry'
   * @returns {Promise<Object>}
   */
  static async syncProject(projectId, { triggeredBy = 'system' } = {}) {
    let jobId = null;
    let project = null;

    try {
      project = await ProjectModel.findById(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found in database.`);
      }

      // 1. Create a sync_jobs row (status: 'running')
      const jobRes = await query(
        `INSERT INTO sync_jobs (project_id, state, target_type, status, run_at, error_log)
         VALUES ($1, $2, 'PROJECT', 'running', NOW(), $3)
         RETURNING *`,
        [project.id, project.state, `Triggered by: ${triggeredBy}`]
      );
      jobId = jobRes.rows[0].id;

      // 2. Resolve target adapter
      const adapter = getAdapterForState(project.state);

      // 3. Retry loop for transient failures (max 2 retries = 3 total attempts)
      let attempt = 0;
      const maxRetries = 2;
      let rawData = null;
      let lastError = null;

      while (attempt <= maxRetries) {
        try {
          rawData = await adapter.fetchProjectDetail(project.rera_number);
          break; // Success, exit retry loop
        } catch (err) {
          lastError = err;
          attempt++;

          // Do NOT retry blindly on structural parser failures or not-found errors
          if (err instanceof StructuralSyncError || err instanceof ProjectNotFoundError) {
            break;
          }

          // If transient and we have retries left, back off and retry
          if (attempt <= maxRetries) {
            const backoffMs = 400 * Math.pow(2, attempt);
            await new Promise((r) => setTimeout(r, backoffMs));
          }
        }
      }

      // If we failed after all attempts
      if (!rawData) {
        throw lastError || new Error('Sync failed with unknown error.');
      }

      // 4. Reconciliation Engine: Synced Data vs. Stored Facts
      const storedPossessionDate = formatDateOnly(project.registered_possession_date);
      const syncedPossessionDate = formatDateOnly(rawData.registeredPossessionDate);

      let reconciliationStatus = 'matched';
      let previousDate = project.previous_registered_possession_date
        ? formatDateOnly(project.previous_registered_possession_date)
        : null;

      if (storedPossessionDate && syncedPossessionDate && storedPossessionDate !== syncedPossessionDate) {
        // Mismatch detected! Preserve old date for display comparison, update to synced date
        reconciliationStatus = 'mismatched';
        previousDate = storedPossessionDate;
      } else if (!storedPossessionDate && syncedPossessionDate) {
        reconciliationStatus = 'matched';
      }

      // 5. Update project record with verified fields
      const updatedProjectRes = await query(
        `UPDATE projects
         SET name = COALESCE($1, name),
             developer_name = COALESCE($2, developer_name),
             registered_possession_date = COALESCE($3, registered_possession_date),
             current_status = COALESCE($4, current_status),
             oc_issued = COALESCE($5, oc_issued),
             source_url = COALESCE($6, source_url),
             complaint_count = $7,
             raw_html_snapshot = $8,
             data_source = 'verified_synced',
             reconciliation_status = $9,
             previous_registered_possession_date = $10,
             last_synced_at = NOW(),
             updated_at = NOW()
         WHERE id = $11
         RETURNING *`,
        [
          rawData.name || null,
          rawData.developerName || null,
          syncedPossessionDate,
          rawData.currentStatus || null,
          rawData.ocIssued,
          rawData.sourceUrl || null,
          rawData.complaintCount || 0,
          rawData.rawHtmlSnapshot || null,
          reconciliationStatus,
          previousDate,
          project.id,
        ]
      );

      // 6. Mark sync_jobs as success
      await query(
        `UPDATE sync_jobs
         SET status = 'success',
             completed_at = NOW(),
             retry_count = $1,
             error_log = NULL
         WHERE id = $2`,
        [attempt, jobId]
      );

      return {
        success: true,
        jobId,
        project: updatedProjectRes.rows[0],
        reconciliationStatus,
        retriesUsed: attempt,
      };
    } catch (err) {
      // 7. Error handling: Visible failure in sync_jobs, never crash the process
      const errorMsg = `[${err.name || 'Error'}] ${err.message}`;
      console.error(`[SyncService] Sync failed for project ${projectId}: ${errorMsg}`);

      if (jobId) {
        await query(
          `UPDATE sync_jobs
           SET status = 'failed',
               completed_at = NOW(),
               error_log = $1
           WHERE id = $2`,
          [errorMsg, jobId]
        );
      }

      return {
        success: false,
        jobId,
        error: errorMsg,
        isTransient: err.isTransient || false,
      };
    }
  }

  /**
   * On-demand user sync with strict per-user/per-project 1-hour rate limiting
   */
  static async requestManualSync(userId, projectId) {
    const key = `${userId}:${projectId}`;
    const now = Date.now();
    const lastSync = manualSyncCooldowns.get(key);

    if (lastSync && now - lastSync < MANUAL_SYNC_COOLDOWN_MS) {
      const remainingMinutes = Math.ceil((MANUAL_SYNC_COOLDOWN_MS - (now - lastSync)) / (60 * 1000));
      return {
        rateLimited: true,
        error: `Rate limit active: You can request an official portal sync once every hour. Next sync available in ${remainingMinutes} minute(s).`,
        remainingMinutes,
      };
    }

    const result = await this.syncProject(projectId, { triggeredBy: `manual_user_${userId}` });
    if (result.success) {
      manualSyncCooldowns.set(key, now);
    }
    return { rateLimited: false, ...result };
  }

  /**
   * Batch sync for all projects linked to active buyer cases (used by scheduled job)
   */
  static async syncAllActiveCases() {
    try {
      console.log('[SyncScheduler] Initiating daily scheduled sync of active case projects...');
      const res = await query(
        `SELECT DISTINCT p.id, p.name, p.rera_number, p.state 
         FROM projects p
         JOIN buyer_cases bc ON p.id = bc.project_id`
      );

      const projects = res.rows;
      console.log(`[SyncScheduler] Found ${projects.length} active project(s) to synchronize.`);

      const results = [];
      for (const p of projects) {
        const result = await this.syncProject(p.id, { triggeredBy: 'daily_scheduler' });
        results.push({ id: p.id, rera: p.rera_number, ...result });
        // Polite delay between batch project syncs
        await new Promise((r) => setTimeout(r, 1000));
      }

      console.log('[SyncScheduler] Daily scheduled sync batch completed.');
      return results;
    } catch (err) {
      console.error('[SyncScheduler] Error running daily sync batch:', err);
      return [];
    }
  }

  /**
   * Initialize daily scheduler (runs every 24 hours)
   */
  static initScheduler() {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(() => {
      this.syncAllActiveCases().catch((err) =>
        console.error('[SyncScheduler] Uncaught interval error:', err)
      );
    }, TWENTY_FOUR_HOURS);
    console.log('[SyncService] Daily background sync scheduler initialized (24h cadence).');
  }

  /**
   * Aggregate statistics for the Admin Sync Monitoring view
   */
  static async getAggregateStats() {
    // 7-day stats by state
    const sevenDayRes = await query(
      `SELECT 
         state,
         COUNT(*)::int AS total_jobs,
         COUNT(CASE WHEN status = 'success' THEN 1 END)::int AS success_jobs,
         COUNT(CASE WHEN status = 'failed' THEN 1 END)::int AS failed_jobs,
         ROUND((COUNT(CASE WHEN status = 'success' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 1)::float AS success_rate
       FROM sync_jobs
       WHERE run_at >= NOW() - INTERVAL '7 days'
       GROUP BY state`
    );

    // 30-day stats by state
    const thirtyDayRes = await query(
      `SELECT 
         state,
         COUNT(*)::int AS total_jobs,
         COUNT(CASE WHEN status = 'success' THEN 1 END)::int AS success_jobs,
         COUNT(CASE WHEN status = 'failed' THEN 1 END)::int AS failed_jobs,
         ROUND((COUNT(CASE WHEN status = 'success' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 1)::float AS success_rate
       FROM sync_jobs
       WHERE run_at >= NOW() - INTERVAL '30 days'
       GROUP BY state`
    );

    // Total overall summary
    const overallRes = await query(
      `SELECT 
         COUNT(*)::int AS total_all_time,
         COUNT(CASE WHEN status = 'success' THEN 1 END)::int AS success_all_time,
         COUNT(CASE WHEN status = 'failed' THEN 1 END)::int AS failed_all_time,
         MAX(run_at) AS last_run_at
       FROM sync_jobs`
    );

    return {
      last7Days: sevenDayRes.rows,
      last30Days: thirtyDayRes.rows,
      overall: overallRes.rows[0] || {},
    };
  }

  /**
   * Paginated list of recent sync jobs for Admin view
   */
  static async getRecentJobs({ limit = 50, offset = 0, state, status } = {}) {
    let whereClause = '';
    const values = [limit, offset];
    const conditions = [];

    if (state) {
      values.push(state);
      conditions.push(`sj.state ILIKE $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`sj.status = $${values.length}`);
    }

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    const res = await query(
      `SELECT sj.*, 
              p.name AS project_name, 
              p.rera_number,
              p.developer_name
       FROM sync_jobs sj
       LEFT JOIN projects p ON sj.project_id = p.id
       ${whereClause}
       ORDER BY sj.run_at DESC
       LIMIT $1 OFFSET $2`,
      values
    );

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM sync_jobs sj ${whereClause}`,
      values.slice(2)
    );

    return {
      jobs: res.rows,
      total: countRes.rows[0]?.total || 0,
    };
  }
}
