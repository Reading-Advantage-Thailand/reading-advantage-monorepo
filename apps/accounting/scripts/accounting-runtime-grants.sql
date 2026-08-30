\set ON_ERROR_STOP on

-- The migration credential owns the dedicated Accounting database. Keep the
-- OIDC-only runtime role non-owning and grant only the current API operations.
-- Append-only audit enforcement lives here: the runtime role receives no
-- UPDATE or DELETE on accounting_submission_audit_events.
SELECT format(
  'GRANT CONNECT ON DATABASE %I TO accounting_runtime',
  current_database()
) \gexec

GRANT USAGE ON SCHEMA public TO accounting_runtime;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM accounting_runtime;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM accounting_runtime;

-- The app may read, insert, and update submissions (approve/reject mutate status).
GRANT SELECT, INSERT, UPDATE ON TABLE accounting_submissions TO accounting_runtime;
-- The audit trail is append-only for the runtime role: SELECT and INSERT only.
GRANT SELECT, INSERT ON TABLE accounting_submission_audit_events TO accounting_runtime;

-- Do not let future migrations silently broaden runtime access. New tables
-- require an explicit reviewed grant above before the runtime probe will pass.
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM accounting_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM accounting_runtime;
