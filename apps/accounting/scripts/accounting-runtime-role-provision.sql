\set ON_ERROR_STOP on

-- One-off privileged provisioning for the dedicated accounting database.
-- Run as a role that can CREATE ROLE and own database objects (for example the
-- Cloud SQL admin role) on the shared reading-advantage:asia-southeast1:cloud-sql
-- instance. Passwords are supplied at provisioning time; this file is the
-- reviewed procedure, not a secret store.

-- Migration role owns the accounting objects and runs migrations. It must not
-- be able to create other databases or roles, and must not inherit grants.
SELECT format(
  'CREATE ROLE accounting_migration LOGIN PASSWORD %L NOCREATEDB NOCREATEROLE NOINHERIT',
  current_setting('accounting_migration_password', true)
) \gexec
\if :{?accounting_migration_password}
\else
  -- Fallback when the password variable is absent: create the role without
  -- LOGIN so the operator supplies credentials before the first migration.
  CREATE ROLE accounting_migration NOCREATEDB NOCREATEROLE NOINHERIT;
\endif

-- Runtime role is non-owning and least-privilege.
SELECT format(
  'CREATE ROLE accounting_runtime LOGIN PASSWORD %L NOCREATEDB NOCREATEROLE NOINHERIT',
  current_setting('accounting_runtime_password', true)
) \gexec
\if :{?accounting_runtime_password}
\else
  CREATE ROLE accounting_runtime NOCREATEDB NOCREATEROLE NOINHERIT;
\endif

-- The migration role owns the database so migrations can create and alter objects.
ALTER DATABASE accounting OWNER TO accounting_migration;
