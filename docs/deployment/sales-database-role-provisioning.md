# Sales Database Role Provisioning

Sales deployment uses four distinct PostgreSQL identities:

- a privileged administrator used only for initial role provisioning;
- `sales_migration`, a recurring `NOCREATEROLE` schema owner used by Cloud Build;
- `sales_runtime`, the company-auth Cloud Run application identity; and
- `sales_legacy_runtime`, a recovery-only credential for the no-traffic
  compatibility revision.

The privileged administrator URL must not be stored in the Sales Cloud Build
project or passed to routine builds. An authorized operator provisions or
repairs the runtime role once from a controlled workstation:

```bash
set +x
psql "$SALES_PRIVILEGED_ADMIN_DATABASE_URL" \
  -f apps/sales-advantage/scripts/sales-runtime-role-provision.sql
```

Both `sales_runtime` and `sales_legacy_runtime` login identities must already
exist before this script runs. The script requires a PostgreSQL administrator
with permission to alter both roles. In one transaction, it first requires both
identities, verifies that `SUPERUSER`, `REPLICATION`, and `BYPASSRLS` are already
false, then enforces `NOCREATEDB`, `NOCREATEROLE`, and `NOINHERIT`. Managed
PostgreSQL administrators cannot change the sensitive attributes even when
setting them to false, so the script verifies those flags and fails closed
instead of mentioning them in `ALTER ROLE`. Run the script after creating both
identities and after any reviewed role-attribute change.

Routine Cloud Build steps use `SALES_DIRECT_DATABASE_URL`, whose login must be
`sales_migration` with `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
NOREPLICATION NOBYPASSRLS`. That credential owns the Sales database objects and
may run migrations plus `sales-runtime-grants.sql` and
`sales-legacy-runtime-grants.sql`; the grants files deliberately contain no
`ALTER ROLE` statement.

The company-auth revision uses `SALES_DATABASE_URL` as `sales_runtime`. That
role can read company principal rows and call only the constrained
`sync_sales_company_principal(uuid, text, uuid, text, text)` function. It has no
access to `accounts`, `sessions`, or `login_attempts`, and cannot update
`users.role` directly.

The compatibility revision uses `SALES_LEGACY_DATABASE_URL` as
`sales_legacy_runtime`. It can authenticate existing credentials, upgrade only
the password fields of an existing account, and manage login sessions and
attempt counters. It cannot create accounts or users, change a user role, write
company principal mappings, or call the company principal sync function. This
credential is a rollback bridge, not an onboarding path.

Every build runs owner-namespaced setup, company and compatibility probes, and
owner-checked cleanup. The probe owner is the Cloud Build UUID, so concurrent or
retried builds cannot delete one another's rows.

## Cutover order

The Sales build performs these release steps in order:

1. apply migrations, proof queries, curriculum gates, grants, and both runtime
   probes;
2. deploy the reviewed image as a tagged `legacy-school` revision with
   `SALES_LEGACY_DATABASE_URL` and `--no-traffic`;
3. apply the source-role repair from the private manifest, recording the exact
   manifest SHA-256 plus Cloud Build UUID and reviewed commit SHA;
4. deploy the same image in `company` mode with `SALES_DATABASE_URL`.

The build submission must bind the reviewed commit explicitly:

```bash
gcloud builds submit \
  --config=apps/sales-advantage/cloudbuild.yaml \
  --substitutions=_RELEASE_COMMIT_SHA="$(git rev-parse HEAD)" \
  .
```

Do not route traffic to an older Sales revision after the source-role repair.
Its legacy process may use the company runtime credential or a pre-repair code
path. Route rollback traffic only to the compatibility revision created from
the same reviewed image and bound to `SALES_LEGACY_DATABASE_URL`.
