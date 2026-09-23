-- Phase 5 Rollback Migration

DROP TABLE IF EXISTS explanation_requests CASCADE;

ALTER TABLE precedent_orders DROP COLUMN IF EXISTS delay_months;
ALTER TABLE precedent_orders DROP COLUMN IF EXISTS amount_paid_percentage;
ALTER TABLE precedent_orders DROP COLUMN IF EXISTS remedy_type;
ALTER TABLE precedent_orders DROP COLUMN IF EXISTS is_usable;

DROP TABLE IF EXISTS act_provisions CASCADE;
