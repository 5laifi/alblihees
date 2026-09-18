-- ============================================================================
-- VERIFY (read-only). Run after 20260918_02_lock_down_rls.sql.
-- ============================================================================
-- Changes nothing. Lists every table in the public and storage schemas with its
-- RLS status, its policies, and what the anon role is granted.
--
-- Expected for schema "public":
--
--   table                 rls    policies                                  anon_grants
--   --------------------  -----  ----------------------------------------  -----------
--   admin_secrets         true   (none: server-only)                       (none)
--   contact_submissions   true   Public insert contact [INSERT]            INSERT
--   experience_stats      true   Public read experience_stats [SELECT]     SELECT
--   experience_timeline   true   Public read experience_timeline [SELECT]  SELECT
--   media_items           true   Public read media_items [SELECT]          SELECT
--   organizations         true   Public read organizations [SELECT]        SELECT
--   profile               true   Public read profile [SELECT]              SELECT
--   services              true   Public read services [SELECT]             SELECT
--   site_settings         true   Public read public site_settings [SELECT] SELECT
--
-- Anything else needs a look:
--   * a public table that is NOT in the list above (it was not covered by the
--     lockdown, check its policies by hand),
--   * rls = false on any public table,
--   * any policy with [ALL], [UPDATE] or [DELETE],
--   * in schema "storage": any policy on "objects" that lets anon INSERT, UPDATE
--     or DELETE (that would let anyone upload to or wipe your storage buckets).
--     Ignore the anon_grants column for storage tables: Supabase manages those
--     grants itself and the policies are what decide access there.
-- ============================================================================

SELECT
    n.nspname AS schema,
    c.relname AS table_name,
    c.relrowsecurity AS rls,
    COALESCE(
        (SELECT string_agg(
                    p.policyname || ' [' || p.cmd || '] to ' || array_to_string(p.roles, ','),
                    E'\n' ORDER BY p.policyname)
         FROM pg_policies p
         WHERE p.schemaname = n.nspname AND p.tablename = c.relname),
        '(none: server-only)'
    ) AS policies,
    COALESCE(
        NULLIF(concat_ws(', ',
            CASE WHEN has_table_privilege('anon', c.oid, 'SELECT') THEN 'SELECT' END,
            CASE WHEN has_table_privilege('anon', c.oid, 'INSERT') THEN 'INSERT' END,
            CASE WHEN has_table_privilege('anon', c.oid, 'UPDATE') THEN 'UPDATE' END,
            CASE WHEN has_table_privilege('anon', c.oid, 'DELETE') THEN 'DELETE' END,
            CASE WHEN has_table_privilege('anon', c.oid, 'TRUNCATE') THEN 'TRUNCATE' END
        ), ''),
        '(none)'
    ) AS anon_grants
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind = 'r'
ORDER BY n.nspname, c.relname;
