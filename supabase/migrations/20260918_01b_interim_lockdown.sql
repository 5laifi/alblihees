-- ============================================================================
-- INTERIM LOCKDOWN (applied to production on 2026-09-18, before the new code)
-- ============================================================================
-- Closes the public-key hole while the OLD code is still live. Same end state
-- as 20260918_02_lock_down_rls.sql, with one temporary addition so the old
-- contact form keeps working: it inserts and then reads its own row back, so
-- the public role may SELECT a contact row only inside the transaction that
-- created it (created_at = now(); now() is the transaction start time, so no
-- other request can ever match). Nobody can read anyone else's submission.
--
-- Known and accepted effect until the new code is deployed: the old admin panel
-- can log in and view content, but cannot save (it writes with the public key).
--
-- 20260918_02_lock_down_rls.sql drops every policy and recreates the final set,
-- which removes the interim policy and the SELECT grant again.
--
-- One DO block = one statement = atomic: it applies completely or not at all.
-- Rehearsed on the production database in a forced-rollback transaction first
-- (20 role-based checks as anon and service_role, all as expected).
-- ============================================================================

DO $interim$
DECLARE
  p record;
  t text;
  content_tables text[] := ARRAY['services','experience_stats','experience_timeline','organizations','media_items','profile'];
  all_tables text[] := ARRAY['services','experience_stats','experience_timeline','organizations','media_items','profile','contact_submissions','site_settings','admin_secrets'];
BEGIN
  EXECUTE $q$SET LOCAL lock_timeout = '5s'$q$;

  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = ANY(all_tables) LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;

  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  FOREACH t IN ARRAY content_tables LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', 'Public read ' || t, t);
  END LOOP;

  EXECUTE $q$CREATE POLICY "Public read public site_settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (key IN ('maintenance_mode','show_partners','hero_video_url'))$q$;

  EXECUTE $q$CREATE POLICY "Public insert contact" ON public.contact_submissions FOR INSERT TO anon, authenticated WITH CHECK (is_read = false AND char_length(name) BETWEEN 1 AND 100 AND char_length(email) BETWEEN 3 AND 254 AND char_length(coalesce(phone,'')) <= 20 AND char_length(message) BETWEEN 1 AND 5000)$q$;

  -- interim only (see header)
  EXECUTE $q$CREATE POLICY "Interim read own insert" ON public.contact_submissions FOR SELECT TO anon, authenticated USING (created_at = now())$q$;

  EXECUTE 'REVOKE ALL ON public.services, public.experience_stats, public.experience_timeline, public.organizations, public.media_items, public.profile, public.site_settings, public.contact_submissions, public.admin_secrets FROM PUBLIC, anon, authenticated';
  EXECUTE 'GRANT SELECT ON public.services, public.experience_stats, public.experience_timeline, public.organizations, public.media_items, public.profile, public.site_settings TO anon, authenticated';
  EXECUTE 'GRANT INSERT, SELECT ON public.contact_submissions TO anon, authenticated';
  EXECUTE 'GRANT ALL ON public.services, public.experience_stats, public.experience_timeline, public.organizations, public.media_items, public.profile, public.site_settings, public.contact_submissions, public.admin_secrets TO service_role';

  FOREACH t IN ARRAY ARRAY['invoices','invoice_settings'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    END IF;
  END LOOP;
END
$interim$;

-- ----------------------------------------------------------------------------
-- EMERGENCY UNDO (re-opens the hole; only if the live site must edit content
-- before the new code can be deployed). Run as one block:
--
--   DO $undo$ DECLARE t text; BEGIN
--     FOREACH t IN ARRAY ARRAY['services','experience_stats','experience_timeline','organizations','media_items','profile','contact_submissions','site_settings'] LOOP
--       EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated', t);
--       EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true)', 'Anon manage ' || t, t);
--     END LOOP;
--   END $undo$;
-- ----------------------------------------------------------------------------
