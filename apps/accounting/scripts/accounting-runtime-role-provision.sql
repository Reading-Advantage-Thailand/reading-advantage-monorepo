\set ON_ERROR_STOP on

-- One-off privileged provisioning for the dedicated accounting database.
-- Run as a role that can CREATE ROLE and own database objects (for example the
-- Cloud SQL admin role) on the shared reading-advantage:asia-southeast1:cloud-sql
-- instance. Passwords are supplied at provisioning time; this file is the
-- reviewed procedure, not a secret store.

-- Migration role owns the accounting objects and runs migrations. It must not
-- be able to create other databases or roles, and must not inherit grants.

\if :{?accounting_migration_password}
\else
  \echo 'accounting_migration_password is required' >&2
  \quit 2
\endif
\if :{?accounting_runtime_password}
\else
  \echo 'accounting_runtime_password is required' >&2
  \quit 2
\endif

SELECT format(
  'CREATE ROLE accounting_migration LOGIN PASSWORD %L NOCREATEDB NOCREATEROLE NOINHERIT',
  :'accounting_migration_password'
) \gexec

-- Runtime role is non-owning and least-privilege.
SELECT format(
  'CREATE ROLE accounting_runtime LOGIN PASSWORD %L NOCREATEDB NOCREATEROLE NOINHERIT',
  :'accounting_runtime_password'
) \gexec

-- The migration role owns the database so migrations can create and alter objects.
ALTER DATABASE accounting OWNER TO accounting_migration;
