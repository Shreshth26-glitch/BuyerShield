-- Rollback Initial Schema for BuyerShield

DROP TRIGGER IF EXISTS set_timestamp_complaint_drafts ON complaint_drafts;
DROP TRIGGER IF EXISTS set_timestamp_buyer_cases ON buyer_cases;
DROP TRIGGER IF EXISTS set_timestamp_projects ON projects;
DROP TRIGGER IF EXISTS set_timestamp_users ON users;
DROP FUNCTION IF EXISTS trigger_set_timestamp();

DROP TABLE IF EXISTS sync_jobs CASCADE;
DROP TABLE IF EXISTS complaint_drafts CASCADE;
DROP TABLE IF EXISTS precedent_orders CASCADE;
DROP TABLE IF EXISTS case_payments CASCADE;
DROP TABLE IF EXISTS buyer_cases CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
