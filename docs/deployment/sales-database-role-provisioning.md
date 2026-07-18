# Sales Database Role Provisioning

Sales deployment uses three distinct PostgreSQL identities:

- a privileged administrator used only for initial role provisioning;
- `sales_migration`, a recurring `NOCREATEROLE` schema owner used by Cloud Build;
- `sales_runtime`, the restricted Cloud Run application identity.

The privileged administrator URL must not be stored in the Sales Cloud Build
project or passed to routine builds. An authorized operator provisions or
repairs the runtime role once from a controlled workstation:

```bash
set +x
psql "$SALES_PRIVILEGED_ADMIN_DATABASE_URL" \
  -f apps/sales-advantage/scripts/sales-runtime-role-provision.sql
```

The provisioning script requires a PostgreSQL administrator with permission to
alter roles. It makes `sales_runtime` `NOINHERIT` and `NOREPLICATION` and removes
all other cluster-level elevation flags. Run it when the role is created and
after any reviewed role-attribute change.

Routine Cloud Build steps use `SALES_DIRECT_DATABASE_URL`, whose login must be
`sales_migration` with `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
NOREPLICATION NOBYPASSRLS`. That credential owns the Sales database objects and
may run migrations and `sales-runtime-grants.sql`; the grants file deliberately
contains no `ALTER ROLE` statement.

The deployed app uses `SALES_DATABASE_URL` as `sales_runtime`. Every deployment
runs `sales-runtime-probe.sql`, which fails closed unless the role remains
`NOINHERIT`, `NOREPLICATION`, free of role memberships, and limited to the
reviewed relation-specific privileges.
