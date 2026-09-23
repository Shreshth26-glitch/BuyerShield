-- Phase 5: RAG-Grounded Legal Explanation & Precedent Layer Schema

-- 1. Act Provisions Table
CREATE TABLE IF NOT EXISTS act_provisions (
    id SERIAL PRIMARY KEY,
    section_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    full_text TEXT NOT NULL,
    state VARCHAR(100), -- NULL indicates central RERA Act 2016; non-null indicates state-specific rule
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Check and add embedding column for act_provisions (vector(768) if pgvector exists, or jsonb/text fallback)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        EXECUTE 'ALTER TABLE act_provisions ADD COLUMN IF NOT EXISTS embedding vector(768)';
    ELSE
        EXECUTE 'ALTER TABLE act_provisions ADD COLUMN IF NOT EXISTS embedding jsonb';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_act_provisions_section ON act_provisions(section_number);
CREATE INDEX IF NOT EXISTS idx_act_provisions_state ON act_provisions(state);

-- 2. Extend Precedent Orders Table
ALTER TABLE precedent_orders ADD COLUMN IF NOT EXISTS delay_months INTEGER;
ALTER TABLE precedent_orders ADD COLUMN IF NOT EXISTS amount_paid_percentage NUMERIC(5, 2);
ALTER TABLE precedent_orders ADD COLUMN IF NOT EXISTS remedy_type VARCHAR(50); -- 'withdraw' | 'continue'
ALTER TABLE precedent_orders ADD COLUMN IF NOT EXISTS is_usable BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_precedent_orders_remedy ON precedent_orders(remedy_type);
CREATE INDEX IF NOT EXISTS idx_precedent_orders_delay ON precedent_orders(delay_months);

-- 3. Explanation Requests Table (Audit log & evaluation data)
CREATE TABLE IF NOT EXISTS explanation_requests (
    id SERIAL PRIMARY KEY,
    buyer_case_id INTEGER NOT NULL REFERENCES buyer_cases(id) ON DELETE CASCADE,
    remedy_calculation_id INTEGER REFERENCES remedy_calculations(id) ON DELETE SET NULL,
    remedy_type VARCHAR(50) NOT NULL, -- 'withdraw' | 'continue'
    query_text TEXT,
    retrieved_provision_ids INTEGER[] NOT NULL DEFAULT '{}',
    retrieved_precedent_ids INTEGER[] NOT NULL DEFAULT '{}',
    generated_explanation TEXT NOT NULL,
    confidence_flag VARCHAR(50) NOT NULL, -- 'grounded' | 'low_confidence'
    raw_response_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_explanation_requests_case_id ON explanation_requests(buyer_case_id, created_at DESC);
