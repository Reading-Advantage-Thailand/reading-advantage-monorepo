\set ON_ERROR_STOP on

-- The migration credential owns the dedicated Marketing database. Keep the
-- OIDC-only runtime role non-owning and grant only the current API operations.
SELECT format(
  'GRANT CONNECT ON DATABASE %I TO marketing_runtime',
  current_database()
) \gexec

GRANT USAGE ON SCHEMA public TO marketing_runtime;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM marketing_runtime;
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
