\set ON_ERROR_STOP on

-- The migration credential owns the dedicated Marketing database. Keep the
-- OIDC-only runtime role non-owning and grant only the current API operations.
SELECT format(
  'GRANT CONNECT ON DATABASE %I TO marketing_runtime',
  current_database()
) \gexec

GRANT USAGE ON SCHEMA public TO marketing_runtime;

DO $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN
    SELECT class.relname, pg_get_userbyid(class.relowner) AS owner_name
    FROM pg_class AS class
    INNER JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
    WHERE namespace.nspname = 'public'
      AND class.relkind IN ('r', 'p', 'v', 'm', 'f')
    ORDER BY class.relname
  LOOP
    IF table_record.relname IN (
      'durable_job_audit_events',
      'review_job_adoption_audit_events'
    ) OR table_record.owner_name = 'durable_job_audit_owner' THEN
      RAISE NOTICE 'Skipping runtime revoke for public.% (owner: %)',
        table_record.relname,
        table_record.owner_name;
    ELSE
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM %I',
        'public',
        table_record.relname,
        'marketing_runtime'
      );
    END IF;
  END LOOP;
END
$$;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM marketing_runtime;

GRANT SELECT, INSERT, UPDATE ON TABLE campaigns TO marketing_runtime;
GRANT SELECT, INSERT ON TABLE past_topics TO marketing_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE settings TO marketing_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE video_projects TO marketing_runtime;

-- Do not let future migrations silently broaden runtime access. New tables
-- require an explicit reviewed grant above before the runtime probe will pass.
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM marketing_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM marketing_runtime;
