\set ON_ERROR_STOP on

BEGIN;

-- Managed PostgreSQL administrators may not change SUPERUSER, REPLICATION,
-- or BYPASSRLS attributes. Require both identities before any mutation, fail
-- closed unless sensitive attributes are already false, then enforce the role
-- attributes an administrator may change.
DO $$
BEGIN
  IF (
    SELECT count(*)
      FROM pg_roles
     WHERE rolname IN ('sales_runtime', 'sales_legacy_runtime')
  ) <> 2 THEN
    RAISE EXCEPTION 'Both Sales runtime identities must already exist';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_roles
     WHERE rolname IN ('sales_runtime', 'sales_legacy_runtime')
       AND (rolsuper OR rolreplication OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION
      'Sales runtime identities retain a forbidden sensitive attribute';
  END IF;
END
$$;

-- One-time privileged operation. The recurring sales_migration credential is
-- intentionally NOCREATEROLE and must never execute this file.
ALTER ROLE sales_runtime NOCREATEDB NOCREATEROLE NOINHERIT;

-- The recovery-only credential is separate so company mode never inherits
-- password/session privileges.
ALTER ROLE sales_legacy_runtime NOCREATEDB NOCREATEROLE NOINHERIT;

COMMIT;
