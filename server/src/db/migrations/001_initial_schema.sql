-- Phase 1: Initial Database Schema for BuyerShield

-- 1. Enable pgvector extension if available
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS vector;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pgvector extension could not be loaded; falling back to compatible column for Phase 1.';
    END;
END $$;

-- 2. Trigger function for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'buyer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 4. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    rera_number VARCHAR(128) UNIQUE NOT NULL,
    state VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    developer_name VARCHAR(255) NOT NULL,
    registered_possession_date DATE,
    current_status VARCHAR(100) DEFAULT 'ACTIVE',
    oc_issued BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_rera_number ON projects(rera_number);
CREATE INDEX IF NOT EXISTS idx_projects_state ON projects(state);

CREATE TRIGGER set_timestamp_projects
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 5. Buyer Cases Table
CREATE TABLE IF NOT EXISTS buyer_cases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    promised_date_from_agreement DATE,
    amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    chosen_remedy VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_cases_user_id ON buyer_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_cases_project_id ON buyer_cases(project_id);

CREATE TRIGGER set_timestamp_buyer_cases
BEFORE UPDATE ON buyer_cases
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 6. Case Payments Table
CREATE TABLE IF NOT EXISTS case_payments (
    id SERIAL PRIMARY KEY,
    buyer_case_id INTEGER NOT NULL REFERENCES buyer_cases(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    paid_on DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_payments_buyer_case_id ON case_payments(buyer_case_id);

-- 7. Precedent Orders Table
CREATE TABLE IF NOT EXISTS precedent_orders (
    id SERIAL PRIMARY KEY,
    state VARCHAR(100) NOT NULL,
    order_date DATE,
    summary TEXT,
    outcome_type VARCHAR(100),
    awarded_amount NUMERIC(15, 2),
    interest_rate NUMERIC(5, 2),
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add embedding column with vector(768) if pgvector is enabled, or fallback if binary is absent on this machine
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        EXECUTE 'ALTER TABLE precedent_orders ADD COLUMN IF NOT EXISTS embedding vector(768)';
    ELSE
        EXECUTE 'ALTER TABLE precedent_orders ADD COLUMN IF NOT EXISTS embedding text';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_precedent_orders_state ON precedent_orders(state);

-- 8. Complaint Drafts Table
CREATE TABLE IF NOT EXISTS complaint_drafts (
    id SERIAL PRIMARY KEY,
    buyer_case_id INTEGER NOT NULL REFERENCES buyer_cases(id) ON DELETE CASCADE,
    generated_text TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_drafts_buyer_case_id ON complaint_drafts(buyer_case_id);

CREATE TRIGGER set_timestamp_complaint_drafts
BEFORE UPDATE ON complaint_drafts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 9. Sync Jobs Table
CREATE TABLE IF NOT EXISTS sync_jobs (
    id SERIAL PRIMARY KEY,
    state VARCHAR(100),
    target_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING',
    error_log TEXT,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
