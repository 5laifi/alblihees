-- ============================================================================
-- STEP 2 of 2: lock down Row Level Security      RUN THIS *AFTER* DEPLOYING
-- ============================================================================
-- Only run this once the new code is live in production AND you have confirmed
-- that you can log in to /en/admin and save a change. The new code talks to the
-- database with SUPABASE_SERVICE_ROLE_KEY, so it does not need the anon
-- policies removed here. The OLD code does: running this before the deploy
-- breaks the admin panel and the contact form until the deploy lands.
--
-- Run in: Supabase Dashboard > SQL Editor. Everything is in one transaction: if
-- any statement fails, nothing is changed. Safe to run more than once.
--
-- End state for the anon / publishable key:
--   services, experience_stats, experience_timeline,
--   organizations, media_items, profile ......... SELECT only
--   site_settings ............................... SELECT of 3 public keys only
--   contact_submissions ......................... INSERT only (no read)
--   admin_secrets ............................... nothing
-- ============================================================================

BEGIN;

-- 0. Safety interlock: refuse to run until the new code is proven live.
--    Only the new code, running with SUPABASE_SERVICE_ROLE_KEY, can write to
--    admin_secrets, and it does so on the first successful admin login. A hash
--    in that table therefore proves the deploy and the key both work. Without
--    that proof this migration would lock the old code out of the database.
DO $$
BEGIN
    IF to_regclass('public.admin_secrets') IS NULL THEN
        RAISE EXCEPTION 'admin_secrets does not exist. Run 20260918_01_admin_secrets.sql first.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.admin_secrets WHERE key = 'admin_password_hash' AND value <> '') THEN
        RAISE EXCEPTION 'No admin password hash in admin_secrets yet. Deploy the new code, log in to the live admin panel once, then run this file again. Nothing was changed.';
    END IF;
END $$;

-- 1. Drop EVERY existing policy on the application tables, whatever it is called.
--    This removes all "Anon manage ..." policies and "Public read site_settings",
--    and also anything added by hand in the dashboard under another name, so the
--    end state is known instead of assumed. Each dropped policy is listed under
--    "Messages" in the SQL editor.
DO $$
DECLARE
    p record;
BEGIN
    FOR p IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN (
              'services', 'experience_stats', 'experience_timeline', 'organizations',
              'media_items', 'profile', 'contact_submissions', 'site_settings', 'admin_secrets'
          )
    LOOP
        EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
        RAISE NOTICE 'dropped policy "%" on %', p.policyname, p.tablename;
    END LOOP;
END $$;

-- 2. Make sure RLS is on everywhere (no-op where it already is).
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

-- 3. Public, read-only content (this is what the public pages render).
CREATE POLICY "Public read services" ON public.services
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read experience_stats" ON public.experience_stats
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read experience_timeline" ON public.experience_timeline
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read organizations" ON public.organizations
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read media_items" ON public.media_items
    FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read profile" ON public.profile
    FOR SELECT TO anon, authenticated USING (true);

-- 4. site_settings: only the keys the public site actually reads.
--      maintenance_mode -> src/app/[locale]/layout.tsx
--      show_partners    -> src/app/[locale]/page.tsx
--      hero_video_url   -> src/app/[locale]/page.tsx
--    If you add a setting that public pages must read, add its key to this
--    list. Until then it is visible in the admin panel only.
CREATE POLICY "Public read public site_settings" ON public.site_settings
    FOR SELECT TO anon, authenticated
    USING (key IN ('maintenance_mode', 'show_partners', 'hero_video_url'));

-- 5. contact_submissions: the public may insert, never read, update or delete.
--    The limits mirror the validation in src/app/api/contact/route.ts, so the
--    policy cannot be used to bypass them (oversized rows, pre-read messages).
CREATE POLICY "Public insert contact" ON public.contact_submissions
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        is_read = false
        AND char_length(name) BETWEEN 1 AND 100
        AND char_length(email) BETWEEN 3 AND 254
        AND char_length(coalesce(phone, '')) <= 20
        AND char_length(message) BETWEEN 1 AND 5000
    );

-- 6. admin_secrets: no policies at all, on purpose. Server-only.

-- 7. Second layer under RLS: table-level grants. Even if a permissive policy
--    is added back by mistake, the anon role still cannot write.
--    (service_role is untouched and keeps full access.)
REVOKE ALL ON
    public.services, public.experience_stats, public.experience_timeline,
    public.organizations, public.media_items, public.profile,
    public.site_settings, public.contact_submissions, public.admin_secrets
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON
    public.services, public.experience_stats, public.experience_timeline,
    public.organizations, public.media_items, public.profile,
    public.site_settings
TO anon, authenticated;

GRANT INSERT ON public.contact_submissions TO anon, authenticated;

-- 8. Remove any credential rows from site_settings. Credentials live only in
--    admin_secrets now, and a row found here was never trusted or copied.
DELETE FROM public.site_settings
WHERE key IN ('admin_password_hash', 'password_reset_token', 'password_reset_expires');

COMMIT;

-- Make the API layer (PostgREST) pick up the new grants immediately.
NOTIFY pgrst, 'reload schema';

-- Now run 20260918_03_verify.sql and compare the output with the table in it.
