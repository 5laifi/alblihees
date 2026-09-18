-- ============================================================================
-- STEP 1 of 2: create admin_secrets            RUN THIS *BEFORE* DEPLOYING
-- ============================================================================
-- Additive only. Nothing the currently deployed code relies on is changed, so
-- the live site keeps working exactly as before after this runs.
--
-- Run in: Supabase Dashboard > SQL Editor. Safe to run more than once.
--
-- Do NOT change the admin password between running this file and deploying the
-- new code: the old code would write the new hash to site_settings, and the
-- copy made here would be stale.
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

-- Copy the admin password hash across. DO NOTHING on conflict so re-running this
-- file after the new code is live can never roll the password back.
--
-- Password reset tokens are deliberately NOT copied: they were publicly readable,
-- so any outstanding token is treated as compromised. Request a new reset email
-- after the rollout if you need one.
INSERT INTO public.admin_secrets (key, value)
SELECT key, value
FROM public.site_settings
WHERE key = 'admin_password_hash'
  AND value <> ''
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Make the API layer (PostgREST) pick up the new table immediately.
NOTIFY pgrst, 'reload schema';

-- Expected result: one row, has_password_hash = true
-- (false is only correct if nobody has ever logged in to the admin panel).
SELECT EXISTS (
    SELECT 1 FROM public.admin_secrets WHERE key = 'admin_password_hash'
) AS has_password_hash;
