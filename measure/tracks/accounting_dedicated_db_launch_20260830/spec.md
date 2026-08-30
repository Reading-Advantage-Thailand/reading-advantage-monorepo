# Specification: Accounting Dedicated Database Launch

## Overview

Accounting is the only one of the five company apps with no production
deployment. `apps/accounting` contains a working Next.js 16 application, a
standalone Dockerfile, and company SSO routes. It has no Cloud Run service,
no Artifact Registry repository, no Cloud Build pipeline, no secrets, and
no DNS mapping. Its data layer still points at the shared product database:
the submission adapter imports the main `@reading-advantage/db/client`, and
its two tables live in the main migration journal.

The owner decided that Accounting runs on its own dedicated database. This
track provisions that database, moves the Accounting schema onto it, closes
the SSO parity gaps the Sales and Marketing repair identified, and deploys
with the same candidate, no-traffic, manual-promotion gate the sibling apps
use. Browser acceptance runs against a no-traffic candidate before any
traffic shift.

## Evidence

| Fact | Location |
|---|---|
| Accounting has a Dockerfile and no `cloudbuild.yaml` | `apps/accounting/Dockerfile`; no `apps/accounting/cloudbuild.yaml` |
| Accounting has no scripts directory and no promotion script | `apps/accounting/` contains `app`, `lib`, `proxy.ts`, config files only |
| The submission adapter uses the shared main database client | `apps/accounting/app/lib/submissions.ts:23` (`import { client } from "@reading-advantage/db/client"`) |
| The Accounting tables live in the main migration journal | `packages/db/drizzle/0054_chunky_dazzler.sql` (`accounting_submissions`), `0055_eminent_nuke.sql` (`accounting_submission_audit_events`) |
| The Accounting schema is a main-schema module | `packages/db/src/schema/accounting.ts`; re-exported from `packages/db/src/schema/index.ts:27` |
| The Accounting tables are registered EXEMPT in the tenant registry | `packages/domain/src/tenant-registry.ts:194-195` |
| The domain repository issues raw SQL against table names | `packages/backend/src/modules/accounting/postgres-submission-repository.ts:107,133,241,257,274` |
| The company identity database is the dedicated-database precedent: a separate database on the shared instance with its own drizzle journal, config, commands directory, client, and secrets | `packages/db/company-identity/drizzle.config.ts`, `packages/db/company-identity/drizzle/0000..0003`, `packages/db/src/company-identity/{client.ts,migration.ts,environment.ts,commands/}`, env prefix `COMPANY_AUTH_DIRECT_DATABASE_URL` |
| Every sibling pipeline attaches the same shared Cloud SQL instance | `apps/sales-advantage/cloudbuild.yaml:98,134`; `apps/marketing/cloudbuild.yaml:80`; `apps/accounts/cloudbuild.yaml` (`reading-advantage:asia-southeast1:cloud-sql`) |
| Sibling apps use a per-app database plus migration/runtime roles and grants | `docs/deployment/sales-database-role-provisioning.md`; `apps/sales-advantage/scripts/sales-runtime-grants.sql`; `apps/marketing/scripts/marketing-runtime-grants.sql` |
| The deploy skill states one database per app, even on the shared instance | `.agents/skills/gcp-cloud-run-monorepo-deploy/SKILL.md` (Core Rule, step 9) |
| The Accounts OIDC client for Accounting is already registered: id `accounting-web`, audience `accounting`, callback `https://accounting.reading-advantage.com/api/auth/callback` | `apps/accounts/scripts/bootstrap-contract.ts:24`; owner receives the accounting OWNER role in `apps/accounts/scripts/bootstrap-production.ts:78` (`{ applicationKey: "accounting", roleKey: "OWNER" }`) |
| The OIDC client secret secret name already exists in the Accounts build contract | `apps/accounts/cloudbuild.yaml` (`ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET`) |
| The proxy trusts the forwarding hop without an approved-origin check | `apps/accounting/proxy.ts:6-20` (`getPublicUrl` inline) |
| The start route passes `returnTo` to the OIDC client without catching validation failure | `apps/accounting/app/api/auth/company/start/route.ts:10-11` |
| The login page link carries no `returnTo`; the proxy sets one the login page never reads | `apps/accounting/app/login/page.tsx` (`<a href="/api/auth/company/start">`); `apps/accounting/proxy.ts:47-49` |
| The callback renders `?error=sso` but the login page renders no message | `apps/accounting/app/api/auth/callback/route.ts`; `apps/accounting/app/login/page.tsx` |
| The session route already distinguishes states: HTTP 401 with no session token, HTTP 403 for a no-role identity, HTTP 200 for a valid session; the 403 body is `{ session: null }` and lacks the `denied: true` flag the Sales route returns | `apps/accounting/app/api/auth/session/route.ts` (`!session ? 401 : !user ? 403 : 200`); Sales target contract `apps/sales-advantage/app/api/auth/session/route.ts` (403 body `{ session: null, denied: true }`) |
| The callback never checks the Accounting audience role after exchange: a no-role identity receives a session cookie and only learns of denial from the session route | `apps/accounting/app/api/auth/callback/route.ts` (no role check between `exchange` and cookie set) |
| The latest main-journal snapshot still contains both accounting tables, so the next main `drizzle-kit generate` after the schema relocation emits DROP TABLE statements | `packages/db/drizzle/meta/0056_snapshot.json` (48 accounting references); repo precedent `packages/db/drizzle/0056_great_clint_barton.sql` (DROP TABLE emitted when tables left the schema) |
| The main journal enforces append-only audit behavior with a hand-written DO block that revokes UPDATE and DELETE on the audit table from the app role | `packages/db/drizzle/0055_eminent_nuke.sql` (trailing `DO $$ ... REVOKE UPDATE, DELETE ON accounting_submission_audit_events FROM app_user` block) |
| The sibling grants pattern supersedes the DO block: the Marketing grants file revokes all table privileges from the runtime role and grants only the operations each table needs, with default-privilege revokes | `apps/marketing/scripts/marketing-runtime-grants.sql` |
| The Sales parity pattern provides origin approval, the callback-origin handoff, safe return-path fallback, and candidate preview origins | `apps/sales-advantage/lib/public-url.ts`; `apps/sales-advantage/app/api/auth/company/start/route.ts:25-41` |
| The Sales candidate pipeline deploys with `--tag candidate --no-traffic` and promotion is a separate gated script | `apps/sales-advantage/cloudbuild.yaml:123-168`; `apps/sales-advantage/scripts/promote-sales-candidate.sh:4-13` |
| Private evidence files flow through the storage adapter from `STORAGE_*` environment variables, and sibling pipelines prefix the Secret Manager names per app while mapping them to the unprefixed env vars | `apps/accounting/app/lib/private-evidence-storage.ts`; `packages/storage/src/factory.ts:56-61`; `apps/sales-advantage/cloudbuild.yaml:139` (`STORAGE_ENDPOINT=SALES_STORAGE_ENDPOINT:latest`) |
| Postgres.js on Cloud Run needs the Unix-socket form: the connection options read the `host` query parameter and convert a `/cloudsql/...` value into the postgres.js socket `path` option | `.agents/skills/gcp-cloud-run-monorepo-deploy/SKILL.md` (Cloud SQL socket gotcha); `packages/db/src/connection-options.ts:14` |
| The app submissions test mocks the shared client module that the relocation removes | `apps/accounting/app/lib/submissions.test.ts:17` (`vi.mock("@reading-advantage/db/client", ...)`) |

## Decisions

**D-1 - Topology: dedicated database on the existing shared Cloud SQL instance.**
The owner asked for a dedicated database and asked for a cost check between a
new PostgreSQL instance and a separate database on the existing instance.
Repository evidence answers the cost check. The security-sensitive company
identity database already runs as a separate database on the shared
`reading-advantage:asia-southeast1:cloud-sql` instance, with its own drizzle
journal, migration commands, runtime client, least-privilege roles, and
secrets. Marketing and Sales run separate databases on the same instance the
same way. The deploy skill mandates one database per app on the shared
instance. A second always-on Cloud SQL instance adds a fixed monthly cost and
buys no isolation that a separate database with separate roles does not
provide. Accounting therefore gets a new dedicated database on the existing
shared instance, named `accounting`, following the company-identity package
layout. The Phase 1 contract task records this evidence in a short decision
note. If the owner rejects the recommendation, the same tasks switch target
to a new instance named in the note; no app-level task changes.

**D-2 - Identity stays in Accounts. The dedicated database holds only
Accounting product data.** No users, sessions, passwords, or company identity
rows move. SSO continues through the pre-registered `accounting-web` OIDC
client. The `scope_company_id` column stays a plain UUID without a foreign
key, exactly as the schema comment already documents.

**D-3 - Migration of existing product data is a runbook contingency, not a
default.** Accounting has never deployed, so production holds no Accounting
rows. The journal tables on the shared product database are empty in
production. The runbook includes an export-and-import contingency for any
non-production rows an environment contains.

## Functional Requirements

**FR-1 - The Accounting data layer targets a dedicated database.**
A new dedicated Accounting database is provisioned on the shared Cloud SQL
instance, following the company-identity layout: a separate drizzle config,
a separate migration journal under `packages/db/accounting/drizzle/`, schema
entrypoint `packages/db/src/accounting/schema/index.ts`, a runtime-only
client factory `packages/db/src/accounting/runtime.ts` (or `client.ts`) that
reads `ACCOUNTING_DIRECT_DATABASE_URL` for migrations and
`ACCOUNTING_DATABASE_URL` for the runtime, plus `accounting:generate`,
`accounting:migrate`, and `accounting:doctor` package scripts. The first
migration creates `accounting_submissions` and
`accounting_submission_audit_events` with the exact columns, checks, and
indexes the main journal currently defines. The app submission adapter
constructs its postgres.js client through the new factory, and its test mock
moves to the new module. The domain repository changes only by receiving the
injected client; its raw SQL is unchanged. The Accounting table definitions
move out of the main schema index.

**FR-1a - The main journal never emits an Accounting DROP migration.**
Removing the tables from `src/schema/index.ts` makes drizzle-kit diff against
the latest main snapshot (`drizzle/meta/0056_snapshot.json`, which still
contains both tables) and emit `DROP TABLE` statements on the next generate,
exactly as journal entry `0056_great_clint_barton.sql` did for
`finance_records`. The relocation therefore includes a reviewed snapshot
procedure: the accounting table, index, and constraint entries are pruned
from the main-journal snapshot chain tip in the same change that removes the
re-export, so a subsequent main `drizzle-kit generate` produces no
accounting statements. A guard test fails CI if any generated main-journal
migration file references `accounting_submissions` or
`accounting_submission_audit_events`. No main-journal migration in this
track drops or alters either table.

**FR-2 - Separate least-privilege database roles and append-only audit.**
The build uses an `accounting_migration` role that owns the Accounting
objects and runs migrations. The Cloud Run runtime uses an
`accounting_runtime` role that receives only the table privileges the app
needs through a reviewed `apps/accounting/scripts/accounting-runtime-grants.sql`
file, mirroring the Marketing grants file: it revokes all table privileges
from the runtime role, grants `SELECT, INSERT, UPDATE` on
`accounting_submissions`, grants only `SELECT, INSERT` on
`accounting_submission_audit_events`, and revokes future default privileges.
The audit table is therefore append-only for the runtime role, replacing the
hand-written `DO $$ ... REVOKE UPDATE, DELETE ...` block that main journal
entry `0055_eminent_nuke.sql` carries; that block is not regenerated by
drizzle-kit and must not be relied upon. The migration role carries
`NOCREATEDB NOCREATEROLE NOINHERIT`; no build-time credential is a
PostgreSQL superuser. A runtime probe connects as `accounting_runtime`,
exercises the application queries including an audit insert, proves an
UPDATE or DELETE against the audit table is denied, and cleans up its own
rows; the build fails if any probe fails.

**FR-3 - The proxy and auth routes honor approved origins.**
Accounting gains `apps/accounting/app/lib/public-url.ts` mirroring the Sales
helper: forwarded `x-forwarded-proto` and `x-forwarded-host` are accepted only
when the resulting origin is the canonical origin, the configured callback
origin, an `ACCOUNTING_PREVIEW_ORIGINS` entry, or localhost in development.
The proxy, callback, start, and logout routes build redirects through the
helper. A start request that arrives on an approved preview origin hands off
to the same start route on the callback origin with `returnTo` preserved; the
transaction, callback, and session cookie live on the callback origin.

**FR-4 - The sign-in entry carries the destination and fails safe.**
The login page builds the sign-in link with the current path and query as
`returnTo`. The start route catches the return-path validation error thrown by
the shared OIDC client, restarts the authorization handoff with `returnTo=/`,
and logs one structured warning line. No start request returns a 500 for any
`returnTo` input.

**FR-5 - Sign-in failures and missing roles are visible to the user.**
The login page renders a visible message for the `sso` error code. The
callback currently sets a session cookie without checking the Accounting
audience role; it gains the role check after the token exchange and redirects
a no-role identity to `/login?error=forbidden`, and the login page renders
that message. The session route already answers a no-role session with HTTP
403 (and a missing token with 401); the remaining delta is the Sales parity
field `denied: true`, so the 403 body becomes
`{"session": null, "denied": true}` while the 401 and 200 bodies keep their
current shape.

**FR-6 - The Cloud Build pipeline deploys a candidate with no traffic.**
`apps/accounting/cloudbuild.yaml` builds and pushes the image to a new
`accounting` Artifact Registry repository, runs the Accounting migrations
through the Cloud SQL Auth Proxy against the new database, runs the doctor
check, applies the runtime grants, runs the runtime probe, deploys the
`accounting` Cloud Run service with `--tag candidate --no-traffic` wired with
`ACCOUNTING_PREVIEW_ORIGINS` set to the candidate URL, and runs a release
verification script against the candidate. The service attaches the shared
Cloud SQL instance, uses a dedicated `accounting-cloud-run` runtime service
account, and receives only Accounting secrets. A new
`apps/accounting/scripts/verify-accounting-release.ts` performs the smoke
checks against a base URL.

**FR-7 - Promotion is a separate manual gate.**
`apps/accounting/scripts/promote-accounting-candidate.sh` requires a
`CANDIDATE_REVISION` and a non-empty acceptance note whose contents include
`status: pass`; it shifts 100 percent of traffic to the candidate revision
and then runs the release verification against production. No pipeline step
shifts production traffic.

**FR-8 - Secrets cover database, SSO, and evidence storage.**
Secret Manager holds the per-app-prefixed secrets `ACCOUNTING_DIRECT_DATABASE_URL`,
`ACCOUNTING_DATABASE_URL`, `ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET`,
`ACCOUNTING_STORAGE_ENDPOINT`, `ACCOUNTING_STORAGE_REGION`,
`ACCOUNTING_STORAGE_BUCKET`, `ACCOUNTING_STORAGE_ACCESS_KEY`,
`ACCOUNTING_STORAGE_SECRET_KEY`, and `ACCOUNTING_STORAGE_PUBLIC_BASE_URL`.
The Cloud Run secret mapping follows the sibling convention exactly as
Sales does (`STORAGE_ENDPOINT=SALES_STORAGE_ENDPOINT:latest`): the
`ACCOUNTING_STORAGE_*` secrets map to the unprefixed `STORAGE_*` environment
variables that `packages/storage/src/factory.ts:56-61` reads, and
`ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET` maps to
`COMPANY_AUTH_OIDC_CLIENT_SECRET`. The service environment sets
`NODE_ENV=production`,
`COMPANY_AUTH_ISSUER_URL=https://accounts.reading-advantage.com`,
`COMPANY_AUTH_OIDC_CLIENT_ID=accounting-web`,
`COMPANY_AUTH_OIDC_REDIRECT_URI=https://accounting.reading-advantage.com/api/auth/callback`,
`COMPANY_AUTH_EXPECTED_AUDIENCE=accounting`, and
`COMPANY_AUTH_CLOCK_SKEW_SECONDS=30`.

**FR-9 - DNS routes the production domain.**
A Cloud Run domain mapping points `accounting.reading-advantage.com` at the
service, and the Squarespace DNS record is updated to match. The domain
serves HTTPS only.

## Non-Functional Requirements

- The OIDC client, cookie names (`__Host-ra_accounting_session`,
  `__Host-ra_accounting_oidc_tx`), cookie lifetime, and Accounts issuer
  configuration do not change.
- The shared OIDC client in `packages/auth` is used unchanged; no route
  implements a local OIDC exchange.
- No code imports a provider SDK directly; GCP specifics stay in the
  Dockerfile, cloudbuild, scripts, and the runbook.
- The main product migration journal gains no Accounting-table statement in
  this track. Removing the schema re-export alone makes drizzle-kit generate
  DROP statements against the stale snapshot; FR-1a requires the reviewed
  snapshot-pruning procedure plus a guard test, and no generated main
  migration may reference either Accounting table. The tenant registry
  continues to build, and its EXEMPT classification of the two tables stays
  valid through the relocated import.
- The append-only audit invariant is enforced on the dedicated database by
  grants, not by the journal: the runtime role receives no UPDATE or DELETE
  privilege on `accounting_submission_audit_events`, and the probes prove
  both the allowed INSERT and the denied write.
- The new Accounting journal contains only the two Accounting tables and
  their indexes; it never creates product, company-identity, or other
  application tables.
- The runtime service account receives only `roles/secretmanager.secretAccessor`
  on the Accounting secrets and `roles/cloudsql.client`; Cloud Build receives
  `roles/run.admin` and `roles/iam.serviceAccountUser` for the runtime
  account.
- Every acceptance case that needs a sign-in uses a demo or owner Accounting
  identity provisioned in Accounts; no password appears in logs, test output,
  or git.
- `pnpm turbo run check-types`, `lint`, and `test` for `accounting` and
  `@reading-advantage/db` pass before the first build submission.

## Acceptance Criteria

- A fresh Accounting database migrates to the terminal journal tag with zero
  failures; the doctor check exits 0 against that database.
- The migration role cannot create databases or roles; the runtime role
  cannot create tables. The grants probe passes, the runtime role can INSERT
  an audit row but an UPDATE or DELETE on `accounting_submission_audit_events`
  is denied, and the negative probe (runtime DDL attempt) fails as expected.
- After the schema relocation, a main `drizzle-kit generate` produces no
  migration referencing either Accounting table, and the guard test fails if
  any checked-in main-journal migration names them. The tip snapshot no
  longer contains the Accounting tables.
- The Accounting app reads and writes submissions only against the dedicated
  database; a query against the main product database shows no Accounting
  access path from the running service.
- Opening `https://accounting.reading-advantage.com/` unauthenticated
  redirects to `/login?returnTo=%2F`, and the sign-in link preserves the
  original path and query for deep links.
- A request to `/api/auth/company/start?returnTo=https://evil.example.com`
  returns a 307 to the Accounts authorize URL, logs one warning, and never
  returns a 500.
- A start request on the candidate preview URL redirects to the callback
  origin start route with `returnTo` preserved, and the completed sign-in
  sets the session cookie on the callback origin.
- A failed sign-in shows a visible message naming the error; a signed-in
  identity without an Accounting role sees the `forbidden` message, and the
  session route returns 403 with `{"session": null, "denied": true}`.
- The Cloud Build run completes with the candidate revision serving zero
  traffic; the release verification script passes against the candidate URL.
- The promotion script refuses to run without an acceptance note containing
  `status: pass`; after promotion, the script passes against
  `https://accounting.reading-advantage.com`.
- `https://accounting.reading-advantage.com` returns 2xx over HTTPS, the
  login page renders, an unauthenticated API call returns 401 (not 500), and
  a signed-in staff identity can submit an expense with an evidence file and
  see it listed.
- No new Cloud Run error logs appear during the smoke window.
- Browser acceptance captures the redirect chain and a screenshot for the
  unauthenticated, failed-sign-in, forbidden, candidate handoff, and
  authenticated submission cases.

## Out of Scope

- Double-entry ledger, chart of accounts, VAT, withholding tax, tax invoices,
  and accountant export. The `accounting_app_foundation_20260820` track
  (stories S5-S8) owns them; they deploy into the dedicated database this
  track creates.
- Any change to the Accounts issuer, the company identity database, or the
  OIDC client registration beyond consuming the existing `accounting-web`
  client.
- A second Cloud SQL instance. Decision D-1 documents the separate-database
  choice; a new instance requires explicit owner rejection of that decision.
- Migration of historical Accounting rows from the main product database.
  The runbook contingency covers non-production rows only.
- A shared cross-app public-URL helper package. This track ports the proven
  Sales pattern into the Accounting app; the shared package remains recorded
  tech debt owned by the Sales and Marketing parity track.
- Sales, Marketing, Codecamp, and Accounts deployments. Their pipelines and
  candidate behavior do not change.
- Removing the Accounting schema module from the main journal by destructive
  migration on any database. The module moves package location; existing
  journal history stays intact.
