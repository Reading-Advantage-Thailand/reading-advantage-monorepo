\set ON_ERROR_STOP on

-- One-time privileged operation. The recurring sales_migration credential is
-- intentionally NOCREATEROLE and must never execute this file.
ALTER ROLE sales_runtime
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS
  NOINHERIT NOREPLICATION;

-- The recovery-only credential is separate so company mode never inherits
-- password/session privileges.
ALTER ROLE sales_legacy_runtime
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS
  NOINHERIT NOREPLICATION;
