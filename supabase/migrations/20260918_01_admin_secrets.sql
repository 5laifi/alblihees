-- ============================================================================
-- STEP 1 of 2: create admin_secrets            RUN THIS *BEFORE* DEPLOYING
-- ============================================================================
-- Additive only. Nothing the currently deployed code relies on is changed, so
-- the live site keeps working exactly as before after this runs.
--
-- Run in: Supabase Dashboard > SQL Editor. Safe to run more than once.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_secrets (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS on, and deliberately NO policies: the anon / publishable key can never
-- read or write this table. Only the service_role / secret key (which bypasses
-- RLS) can, and that key exists only in server-side environment variables.
ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

-- Second layer: remove the table-level grants too, so the table stays closed
-- even if a permissive policy is ever added by mistake.
REVOKE ALL ON public.admin_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_secrets TO service_role;

-- Nothing is copied from site_settings, on purpose. That table is writable with
-- the public key until step 2 runs, so an admin_password_hash row found there
-- cannot be trusted: copying it could install an attacker's password. Instead,
-- the first admin login after the new code is deployed stores a fresh hash of
-- the ADMIN_PASSWORD environment variable here (first-time setup in
-- src/app/api/auth/login/route.ts). Log in with that password once, then change
-- it from Admin > Settings. From then on ADMIN_PASSWORD is no longer accepted.
--
-- Forgot the admin password later? Run this here, then log in with
-- ADMIN_PASSWORD again:
--   DELETE FROM public.admin_secrets WHERE key = 'admin_password_hash';

COMMIT;

-- Make the API layer (PostgREST) pick up the new table immediately.
NOTIFY pgrst, 'reload schema';

-- Expected result: one row, admin_secrets_ready = true
SELECT to_regclass('public.admin_secrets') IS NOT NULL AS admin_secrets_ready;
