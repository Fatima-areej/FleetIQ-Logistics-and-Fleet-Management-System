-- =========================================================
-- Migration 10: Dedicated app role + enforce FORCE RLS
-- =========================================================
-- Run this ONCE in pgAdmin after all other migrations.
-- It creates a non-superuser DB user so that FORCE RLS
-- policies actually filter queries made by the backend.
-- =========================================================

-- 1. Create a non-superuser application role
--    Change the password before running in production.
CREATE USER fleetiq_app WITH PASSWORD 'fleetiq_app_password';

-- 2. Allow it to connect to the database
GRANT CONNECT ON DATABASE fleetiq TO fleetiq_app;

-- 3. Grant full access to all schema objects
--    (mirrors what the postgres user already had)
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO fleetiq_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fleetiq_app;
GRANT EXECUTE ON ALL FUNCTIONS   IN SCHEMA public TO fleetiq_app;
GRANT EXECUTE ON ALL PROCEDURES  IN SCHEMA public TO fleetiq_app;

-- 4. Allow fleetiq_app to SET LOCAL ROLE per-request
--    so the correct RLS policy is enforced for each user's role
GRANT fleet_admin   TO fleetiq_app;
GRANT fleet_manager TO fleetiq_app;
GRANT fleet_driver  TO fleetiq_app;

-- 5. FORCE RLS so that even a table owner is filtered.
--    Without FORCE, the postgres superuser bypasses all policies.
--    With fleetiq_app (non-superuser) + FORCE, policies are always enforced.
ALTER TABLE shipments               FORCE ROW LEVEL SECURITY;
ALTER TABLE shipment_status_history FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications           FORCE ROW LEVEL SECURITY;
