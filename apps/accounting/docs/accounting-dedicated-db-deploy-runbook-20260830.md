# Accounting Dedicated Database — Deployment Runbook

Track: `accounting_dedicated_db_launch_20260830`
Date: 2026-08-30

This runbook covers provisioning, roles, secrets, candidate deploy, promotion,
DNS, rollback, smoke, the append-only grants contract, the export-and-import
contingency, and the main-journal snapshot-pruning procedure for any future
table relocation out of the main schema.

## Topology

Accounting runs on a dedicated database named `accounting` on the existing shared
Cloud SQL instance `reading-advantage:asia-southeast1:cloud-sql`. Identity stays
in Accounts; the dedicated database holds only Accounting product data. See
`measure/tracks/accounting_dedicated_db_launch_20260830/db-topology-decision.md`.

## 1. Provision the database and roles

Run `apps/accounting/scripts/accounting-runtime-role-provision.sql` from a
privileged workstation role (Cloud SQL admin) on the shared instance, supplying
`accounting_migration_password` and `accounting_runtime_password`:

```bash
psql "$ADMIN_DATABASE_URL" \
  --set=accounting_migration_password="$ACCOUNTING_MIGRATION_PASSWORD" \
  --set=accounting_runtime_password="$ACCOUNTING_RUNTIME_PASSWORD" \
  -f apps/accounting/scripts/accounting-runtime-role-provision.sql
```

This creates `accounting_migration` (NOCREATEDB NOCREATEROLE NOINHERIT, owns the
database) and `accounting_runtime` (NOCREATEDB NOCREATEROLE NOINHERIT, least
privilege). No build credential is a superuser.

## 2. Secrets (Secret Manager)

Create the per-app-prefixed secrets in project `reading-advantage`:

- `ACCOUNTING_DIRECT_DATABASE_URL` — migration role URL (`postgresql://accounting_migration@.../accounting`, Cloud SQL socket form `?host=/cloudsql/...`).
- `ACCOUNTING_DATABASE_URL` — runtime role URL (`postgresql://accounting_runtime@.../accounting`).
- `ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET` — the pre-registered `accounting-web` client secret.
- `ACCOUNTING_STORAGE_ENDPOINT`, `ACCOUNTING_STORAGE_REGION`, `ACCOUNTING_STORAGE_BUCKET`, `ACCOUNTING_STORAGE_ACCESS_KEY`, `ACCOUNTING_STORAGE_SECRET_KEY`, `ACCOUNTING_STORAGE_PUBLIC_BASE_URL` — evidence storage.

The Cloud Run secret mapping follows the sibling convention exactly as Sales does:
`ACCOUNTING_STORAGE_*` map to the unprefixed `STORAGE_*` environment variables that
`packages/storage/src/factory.ts` reads, and `ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET`
maps to `COMPANY_AUTH_OIDC_CLIENT_SECRET`.

## 3. Candidate deploy (no traffic)

Submit `apps/accounting/cloudbuild.yaml`. It builds and pushes the image to the
new `accounting` Artifact Registry repository, runs `accounting:migrate` and
`accounting:doctor` through the Cloud SQL Auth Proxy, applies
`accounting-runtime-grants.sql`, runs `accounting-runtime-probe.sql`, and deploys
the `accounting` Cloud Run service with `--tag candidate --no-traffic`. The
candidate environment sets `ACCOUNTING_PREVIEW_ORIGINS` to the candidate URL. No
pipeline step shifts production traffic.

## 4. Promotion (manual gate)

Run `apps/accounting/scripts/promote-accounting-candidate.sh` only after an
acceptance note whose contents include `status: pass`:

```bash
CANDIDATE_REVISION=<revision> ACCEPTANCE_NOTE=acceptance-note.md \
  bash apps/accounting/scripts/promote-accounting-candidate.sh
```

It shifts 100% of traffic to the candidate revision and then runs the release
verifier against `https://accounting.reading-advantage.com`.

## 5. DNS

Create a Cloud Run domain mapping for `accounting.reading-advantage.com` (HTTPS
only) and update the Squarespace DNS record to match.

## 6. Rollback anchor

The previous serving revision stays available. To roll back, shift traffic back
to the previous revision name recorded before promotion.

## 7. Smoke

- Home page returns 2xx.
- Unauthenticated `/api/auth/session` returns 401 (not 500).
- Malformed `returnTo` start returns 307 (not 500).
- Authenticated expense submission with an evidence file succeeds and lists.
- No new Cloud Run error logs during the smoke window.

## 8. Append-only grants contract

`apps/accounting/scripts/accounting-runtime-grants.sql` is the append-only
enforcement that replaces the hand-written `DO $$ ... REVOKE UPDATE, DELETE ...`
block in main journal entry `0055_eminent_nuke.sql` (which drizzle-kit does not
regenerate). It revokes all table privileges from `accounting_runtime` first,
grants `SELECT, INSERT, UPDATE` on `accounting_submissions`, grants only
`SELECT, INSERT` on `accounting_submission_audit_events`, and sets default-privilege
revokes. The runtime probe proves an audit UPDATE and DELETE are denied.

## 9. Export-and-import contingency

Production holds no Accounting rows (Accounting has never deployed). If a
non-production environment contains Accounting rows in the main product database,
export them before the relocation and import them into the dedicated `accounting`
database after migration:

```bash
pg_dump "$MAIN_DATABASE_URL" -t accounting_submissions -t accounting_submission_audit_events --data-only > accounting-export.sql
psql "$ACCOUNTING_DIRECT_DATABASE_URL" -f accounting-export.sql
```

## 10. Main-journal snapshot-pruning procedure

When relocating a table out of the main schema, prune its table, index, and
constraint entries from the main-journal snapshot chain tip
(`packages/db/drizzle/meta/<latest>_snapshot.json`) in the same change that
removes the re-export, so a subsequent main `drizzle-kit generate` diffs against a
snapshot without the tables and emits no DROP statements. Precedent: journal entry
`0056_great_clint_barton.sql` emitted DROP TABLE when `finance_records` left the
schema. The guard test `packages/db/src/__tests__/main-journal-accounting-guard.test.ts`
fails CI if any checked-in or freshly generated main-journal SQL references
`accounting_submissions` or `accounting_submission_audit_events`.
