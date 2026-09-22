-- Phase 4: Section 18 Remedy Calculator & Interest Rate Policies Schema

-- 1. Interest Rate Policies Table
CREATE TABLE IF NOT EXISTS interest_rate_policies (
    id SERIAL PRIMARY KEY,
    state VARCHAR(100) NOT NULL,
    benchmark_name VARCHAR(255) NOT NULL,
    benchmark_rate_source VARCHAR(255),
    benchmark_rate_value NUMERIC(5, 2) NOT NULL,
    added_percentage NUMERIC(5, 2) NOT NULL DEFAULT 2.00,
    effective_from DATE NOT NULL,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interest_rate_policies_state_effective 
ON interest_rate_policies(state, effective_from DESC);

CREATE TRIGGER set_timestamp_interest_rate_policies
BEFORE UPDATE ON interest_rate_policies
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- 2. Remedy Calculations Audit Log Table
CREATE TABLE IF NOT EXISTS remedy_calculations (
    id SERIAL PRIMARY KEY,
    buyer_case_id INTEGER NOT NULL REFERENCES buyer_cases(id) ON DELETE CASCADE,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remedy_type VARCHAR(50) NOT NULL, -- 'withdraw' | 'continue'
    applicable_rate NUMERIC(5, 2) NOT NULL,
    principal_amount NUMERIC(15, 2) NOT NULL,
    delay_start_date DATE NOT NULL,
    delay_end_date DATE NOT NULL,
    computed_amount NUMERIC(15, 2) NOT NULL,
    breakdown_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_remedy_calculations_case_id 
ON remedy_calculations(buyer_case_id, calculated_at DESC);

-- 3. Seed Initial State Policies (MahaRERA Rule 18 and K-RERA Rule 16)
INSERT INTO interest_rate_policies (
    state,
    benchmark_name,
    benchmark_rate_source,
    benchmark_rate_value,
    added_percentage,
    effective_from,
    source_url
) VALUES 
(
    'Maharashtra',
    'SBI Highest MCLR',
    'State Bank of India 1-Year MCLR as notified by MahaRERA under Rule 18',
    9.10,
    2.00,
    '2024-04-01',
    'https://maharera.maharashtra.gov.in/notifications'
),
(
    'Karnataka',
    'SBI Highest MCLR',
    'State Bank of India Highest Marginal Cost of Funds Based Lending Rate under K-RERA Rule 16',
    9.10,
    2.00,
    '2024-04-01',
    'https://rera.karnataka.gov.in/circulars'
)
ON CONFLICT DO NOTHING;
