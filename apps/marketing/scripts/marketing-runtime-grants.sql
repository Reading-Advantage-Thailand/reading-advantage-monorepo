\set ON_ERROR_STOP on

-- The migration credential owns the dedicated Marketing database. Keep the
-- runtime role non-owning and grant only the operations exercised by auth and
-- the current Marketing API surface.
SELECT format(
  'GRANT CONNECT ON DATABASE %I TO marketing_runtime',
  current_database()
) \gexec

GRANT USAGE ON SCHEMA public TO marketing_runtime;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM marketing_runtime;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM marketing_runtime;

GRANT SELECT ON TABLE users TO marketing_runtime;
GRANT SELECT, UPDATE ON TABLE accounts TO marketing_runtime;
GRANT SELECT, INSERT, DELETE ON TABLE sessions TO marketing_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE login_attempts TO marketing_runtime;
GRANT INSERT ON TABLE audit_events TO marketing_runtime;

GRANT SELECT, INSERT, UPDATE ON TABLE campaigns TO marketing_runtime;
GRANT SELECT, INSERT ON TABLE past_topics TO marketing_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE settings TO marketing_runtime;
GRANT SELECT, INSERT ON TABLE video_projects TO marketing_runtime;

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
