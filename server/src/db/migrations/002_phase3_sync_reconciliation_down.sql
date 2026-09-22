-- Rollback Phase 3 Schema Updates
ALTER TABLE projects DROP COLUMN IF EXISTS previous_registered_possession_date;
ALTER TABLE projects DROP COLUMN IF EXISTS reconciliation_status;
ALTER TABLE projects DROP COLUMN IF EXISTS raw_html_snapshot;
ALTER TABLE projects DROP COLUMN IF EXISTS complaint_count;
ALTER TABLE projects DROP COLUMN IF EXISTS data_source;

ALTER TABLE sync_jobs DROP COLUMN IF EXISTS completed_at;
ALTER TABLE sync_jobs DROP COLUMN IF EXISTS retry_count;
ALTER TABLE sync_jobs DROP COLUMN IF EXISTS project_id;
