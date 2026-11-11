-- Founder OS — REFERENCE ONLY
-- Apply only after: backup verification, staging test, explicit production approval.
-- Never modify Titanium Guardian objects from this file.

-- Dedicated schema (all Founder OS app tables live here)
CREATE SCHEMA IF NOT EXISTS founder_os;

-- ---------------------------------------------------------------------------
-- Roles: create in Supabase SQL editor (names are illustrative)
--   founder_os_app   — runtime API/worker: USAGE on founder_os, SELECT/INSERT/UPDATE/DELETE on founder_os.* only
--   founder_os_migrator — CI only: CREATE/ALTER in founder_os only (not used at runtime)
-- ---------------------------------------------------------------------------

-- Example grants (run as superuser / dashboard — adjust to your role names)
-- REVOKE ALL ON SCHEMA public FROM founder_os_app;
-- GRANT USAGE ON SCHEMA founder_os TO founder_os_app;
-- GRANT ALL ON ALL TABLES IN SCHEMA founder_os TO founder_os_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA founder_os GRANT ALL ON TABLES TO founder_os_app;

-- NOTE: Enable RLS on each table and policies for founder-only access in a follow-up migration.
