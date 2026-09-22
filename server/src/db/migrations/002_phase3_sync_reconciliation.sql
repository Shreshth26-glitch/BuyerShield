-- Phase 3: RERA Portal Ingestion & Reconciliation Schema Updates

-- 1. Enhance sync_jobs table
ALTER TABLE sync_jobs ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE sync_jobs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE sync_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sync_jobs_project_id ON sync_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_run_at ON sync_jobs(run_at);

-- 2. Enhance projects table with reconciliation & source tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS data_source VARCHAR(50) DEFAULT 'self_reported';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS complaint_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS raw_html_snapshot TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reconciliation_status VARCHAR(50) DEFAULT 'unverified';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS previous_registered_possession_date DATE;

CREATE INDEX IF NOT EXISTS idx_projects_reconciliation_status ON projects(reconciliation_status);
