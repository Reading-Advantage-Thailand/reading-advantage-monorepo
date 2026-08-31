# Implementation Plan: Accounting Dedicated Database Launch

> **Browser acceptance.** Run every acceptance case in the live application.
> Capture a screenshot and the redirect chain from the network panel for
> each case. Unit tests on `proxy.ts` and the auth routes alone do not close
> a phase; the defects are host-dependent and cookie-dependent.

> **Deploy safely.** Accounting deploys a tagged `candidate` revision with no
> traffic. Production traffic moves only through the promotion script, and
> the script runs only after an acceptance note whose contents include
> `status: pass`. The previous revision stays available as the rollback
> anchor.

> **Dedicated database.** Accounting data moves to a new dedicated database
> on the existing shared Cloud SQL instance, following the company-identity
> layout. Decision D-1 in the spec records the evidence. No production
> Accounting rows exist; the runbook carries an export-and-import
> contingency for non-production rows.

## Phase 1: Contract & Schema Definition

_Blast radius: packages/db - new `packages/db/accounting/drizzle.config.ts`,
new `packages/db/src/accounting/` tree (schema entrypoint, runtime client,
environment, migration and doctor commands), `package.json` scripts and
exports, `src/schema/index.ts`, `src/schema/accounting.ts` relocation, and
the tenant-registry import in `packages/domain/src/tenant-registry.ts`.
Accounting app - `app/lib/submissions.ts`, new `app/lib/public-url.ts`,
`proxy.ts`, `app/login/page.tsx`, the start, callback, logout, and session
auth routes, and new `apps/accounting/scripts/` plus
`apps/accounting/cloudbuild.yaml`. Docs - a new Accounting deploy runbook.
The shared OIDC client in `packages/auth` stays unchanged; Accounts changes
nothing because the `accounting-web` client is already registered._

- [x] Task: Record the database topology decision
    - [x] Write `measure/tracks/accounting_dedicated_db_launch_20260830/db-topology-decision.md` recording decision D-1
    - [x] Cite the company-identity precedent: separate database on the shared instance with its own journal, commands, roles, and secrets (`packages/db/company-identity/`, `packages/db/src/company-identity/`)
    - [x] Cite the per-app-database rule in `.agents/skills/gcp-cloud-run-monorepo-deploy/SKILL.md`
    - [x] Record the alternative (a new always-on Cloud SQL instance), its fixed monthly cost, and the owner rejection path that would switch the target
- [x] Task: Define the dedicated Accounting database package contract
    - [x] New `packages/db/accounting/drizzle.config.ts` with schema input `./src/accounting/schema/index.ts`, output `./accounting/drizzle`, and a generation-only unreachable URL fallback, mirroring the company-identity config
    - [x] New `packages/db/src/accounting/environment.ts` parsing `ACCOUNTING_DIRECT_DATABASE_URL` (migrations) and `ACCOUNTING_DATABASE_URL` (runtime), failing closed on malformed values
    - [x] New runtime-only client factory in `packages/db/src/accounting/` that builds a postgres.js client from the runtime URL and exports no migration tooling
    - [x] New `accounting:generate`, `accounting:migrate`, and `accounting:doctor` scripts in `packages/db/package.json`, plus package exports for the runtime client
    - [x] The migration and doctor commands mirror `src/company-identity/commands/` and target the `accounting/drizzle` journal
- [x] Task: Define the Accounting schema move contract
    - [x] Move the `accountingSubmissions` and `accountingSubmissionAuditEvents` table definitions from `packages/db/src/schema/accounting.ts` into `packages/db/src/accounting/schema/index.ts` with columns, checks, and indexes unchanged
    - [x] Remove the accounting re-export from `packages/db/src/schema/index.ts` so the main drizzle config no longer sees the tables
    - [x] The tenant registry imports the two table definitions from the new accounting schema entrypoint and keeps their EXEMPT classification, so the registry coverage build stays green
    - [x] No main-journal migration in this track drops, alters, or recreates either table; journal entries `0054` and `0055` remain history
    - [x] Define the snapshot-pruning procedure for FR-1a: in the same change that removes the re-export, prune the accounting table, index, and constraint entries from the main-journal snapshot chain tip (`packages/db/drizzle/meta/0056_snapshot.json`, 48 accounting references) and any successor snapshot, so the next main `drizzle-kit generate` diffs against a snapshot without the tables and emits no DROP statements; precedent for the hazard is journal entry `0056_great_clint_barton.sql`, which emitted DROP TABLE when `finance_records` left the schema
    - [x] Define a CI guard test that fails if any checked-in or freshly generated main-journal SQL file under `packages/db/drizzle/` references `accounting_submissions` or `accounting_submission_audit_events`
- [x] Task: Define the migration journal, roles, grants, and probe contract
    - [x] The new journal starts at `0000` and creates `accounting_submissions` and `accounting_submission_audit_events` with the exact constraints and index in main journal entries `0054` and `0055`; the hand-written `DO $$ ... REVOKE UPDATE, DELETE` block at the tail of `0055_eminent_nuke.sql` is NOT regenerated by drizzle-kit and is not carried into the journal
    - [x] Append-only audit enforcement (FR-2) lives in `apps/accounting/scripts/accounting-runtime-grants.sql`, mirroring `apps/marketing/scripts/marketing-runtime-grants.sql`: REVOKE all table privileges from `accounting_runtime`, GRANT `SELECT, INSERT, UPDATE` on `accounting_submissions`, GRANT only `SELECT, INSERT` on `accounting_submission_audit_events`, GRANT USAGE on schema and CONNECT on database, and ALTER DEFAULT PRIVILEGES revoking future table and sequence privileges from PUBLIC and the runtime role
    - [x] An `accounting_migration` role owns the objects and runs migrations with `NOCREATEDB NOCREATEROLE NOINHERIT`; no build credential is a superuser; the grants file contains no `ALTER ROLE` statement
    - [x] A one-off privileged provisioning script creates both login roles, mirroring `docs/deployment/sales-database-role-provisioning.md`
    - [x] A runtime probe connects as `accounting_runtime`, exercises the application queries including an audit insert, proves an UPDATE and a DELETE against `accounting_submission_audit_events` are denied, and cleans up its own rows; a negative probe confirms the runtime role cannot create tables
- [x] Task: Define the Accounting public URL and origin-approval contract
    - [x] New `apps/accounting/app/lib/public-url.ts` exporting `getPublicUrl(request, pathname)`, `getPublicOrigin(request)`, and `getAccountingCallbackOrigin()`
    - [x] A forwarded origin is used only when it is the canonical origin (`https://accounting.reading-advantage.com`), the configured callback origin, an `ACCOUNTING_PREVIEW_ORIGINS` entry, or localhost in development
    - [x] The helper rejects an unapproved forwarded origin the way the Sales helper does; callers then build targets from the configured public origin
    - [x] A start request on an approved preview origin hands off to the same start route on the callback origin with `returnTo` preserved; the transaction, callback, and session cookie live on the callback origin
- [x] Task: Define the sign-in entry, safe return-path, and error-surface contract
    - [x] The login page builds the sign-in link from the current path and query as `returnTo`
    - [x] The start route catches the shared client return-path validation error, restarts the handoff with `returnTo=/`, and logs one structured warning; it never returns 500 for a `returnTo` value
    - [x] Enumerate login page codes with producers: `sso` from the callback failure paths, `forbidden` from the callback role check
    - [x] The callback checks the Accounting audience role after exchange and redirects to `/login?error=forbidden` when absent; today the callback sets the session cookie without that check
    - [x] The session route already returns 401 for a missing session and 403 for a no-role identity; the only delta is the Sales parity field, so the 403 body becomes `{"session": null, "denied": true}` while the 401 and 200 bodies keep their current shape (`{"session": null}` and `{"session": {"user": ...}}`)
    - [x] Every callback failure path expires the transaction cookie
- [x] Task: Define the Cloud Build candidate pipeline contract
    - [x] New `apps/accounting/cloudbuild.yaml`: build and push to `asia-southeast1-docker.pkg.dev/$PROJECT_ID/accounting/accounting:$BUILD_ID`
    - [x] Steps run migrations, the doctor check, the runtime grants, and the runtime probe through the pinned Cloud SQL Auth Proxy against the shared instance attachment `reading-advantage:asia-southeast1:cloud-sql`
    - [x] The deploy step creates the `accounting` service with `--service-account=accounting-cloud-run@$PROJECT_ID.iam.gserviceaccount.com`, `--tag=candidate`, and `--no-traffic`
    - [x] The candidate environment sets `ACCOUNTING_PREVIEW_ORIGINS` to the candidate URL plus the SSO issuer, client id, redirect URI, audience, and clock-skew values from FR-8
    - [x] A capture step records the candidate URL and a verification step runs the release verifier against it; no step shifts production traffic
- [x] Task: Define the promotion gate and release verification contract
    - [x] New `apps/accounting/scripts/promote-accounting-candidate.sh` requiring `CANDIDATE_REVISION` and a non-empty `ACCEPTANCE_NOTE` whose contents include `status: pass`
    - [x] The script shifts 100 percent of traffic to the candidate revision and then runs the release verifier against `https://accounting.reading-advantage.com`
    - [x] New `apps/accounting/scripts/verify-accounting-release.ts` asserting against a base URL: the login page returns 2xx, an unauthenticated API call returns 401, and a malformed `returnTo` start returns a redirect rather than a 500
- [x] Task: Define the secrets and runtime environment contract
    - [x] Secret Manager names follow the per-app prefix convention exactly as Sales maps `STORAGE_ENDPOINT=SALES_STORAGE_ENDPOINT:latest`: create `ACCOUNTING_DIRECT_DATABASE_URL`, `ACCOUNTING_DATABASE_URL`, `ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET`, `ACCOUNTING_STORAGE_ENDPOINT`, `ACCOUNTING_STORAGE_REGION`, `ACCOUNTING_STORAGE_BUCKET`, `ACCOUNTING_STORAGE_ACCESS_KEY`, `ACCOUNTING_STORAGE_SECRET_KEY`, and `ACCOUNTING_STORAGE_PUBLIC_BASE_URL`; the Cloud Run `--set-secrets` mapping sends `ACCOUNTING_STORAGE_*` to the unprefixed `STORAGE_*` env vars that `packages/storage/src/factory.ts:56-61` reads, and `ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET` to `COMPANY_AUTH_OIDC_CLIENT_SECRET`
    - [x] Database URLs use the Cloud SQL Unix-socket form for postgres.js (`?host=/cloudsql/...`); `packages/db/src/connection-options.ts:14` reads that `host` query parameter and converts a `/cloudsql/...` value into the postgres.js socket `path` option
    - [x] The runtime service account gets only `roles/secretmanager.secretAccessor` on the Accounting secrets and `roles/cloudsql.client`; Cloud Build gets `roles/run.admin` and `roles/iam.serviceAccountUser`
- [x] Task: Define the DNS, smoke, and browser acceptance contract
    - [x] A Cloud Run domain mapping serves `accounting.reading-advantage.com` over HTTPS, with the Squarespace DNS record updated to match
    - [x] Smoke cases: home page 2xx, unauthenticated API 401 (not 500), malformed `returnTo` 307, authenticated expense submission with an evidence file succeeds and lists, no new Cloud Run error logs
    - [x] Browser cases: unauthenticated deep link, failed sign-in, forbidden identity, candidate preview handoff with completed sign-in, authenticated submission; each captures the redirect chain and a screenshot
- [x] Task: Define the runbook and data-contingency contract
    - [x] New `apps/accounting/docs/accounting-dedicated-db-deploy-runbook-20260830.md` covers provisioning, roles, secrets, candidate deploy, promotion, DNS, rollback, and smoke commands
    - [x] The runbook includes an export-and-import contingency for any non-production Accounting rows found in the main product database; production has none
    - [x] The runbook names the rollback anchor: shift traffic back to the previous serving revision
- [b] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md) deferred:owner

## Phase 2: Test

Red-phase commits contain ONLY the new test files and Measure document edits.

- [x] Task: Write dedicated-database configuration Red tests
    - [x] `packages/db/src/accounting/__tests__/environment.test.ts`: parses `ACCOUNTING_DIRECT_DATABASE_URL` and `ACCOUNTING_DATABASE_URL`, rejects malformed values, and fails closed when both are absent
    - [x] The migrate command resolves the `accounting/drizzle` journal folder and the direct URL; the doctor command wires the same configuration
    - [x] The runtime client factory builds a postgres.js client from the runtime URL and exposes no migration entry point
- [x] Task: Write Accounting schema parity Red tests
    - [x] The accounting schema entrypoint exports exactly `accountingSubmissions` and `accountingSubmissionAuditEvents`
    - [x] Column names, types, nullability, checks, and the audit-event index match the current definitions in `packages/db/src/schema/accounting.ts`
    - [x] The generated `0000` migration SQL creates both tables with the same constraints as journal entries `0054` and `0055`
- [x] Task: Write main-schema exclusion, snapshot, and journal-guard Red tests
    - [x] `packages/db/src/schema/index.ts` no longer re-exports the accounting tables
    - [x] The tip snapshot under `packages/db/drizzle/meta/` contains no `accounting_submissions` or `accounting_submission_audit_events` entries after the pruning procedure
    - [x] A new guard test (`packages/db/src/__tests__/main-journal-accounting-guard.test.ts`) scans every main-journal SQL file under `packages/db/drizzle/` whose journal tag is newer than the relocation baseline (entries `0054` and `0055` legitimately create the tables and stay exempt) and fails if any references either Accounting table; the guard itself fails Red before the pruning procedure lands
    - [x] The guard test also runs `drizzle-kit generate` for the main config into a temporary output and asserts the generated SQL contains no accounting statements (zero-file or accounting-free output); this is achievable only after the snapshot pruning, so it fails Red before that step
    - [x] The tenant registry still builds and still classifies both accounting tables (imported from the new entrypoint)
- [x] Task: Write Accounting public URL Red tests
    - [x] Uses approved `x-forwarded-host` and `x-forwarded-proto` values to build the public origin
    - [x] Rejects a forwarded host that is not on the approved list
    - [x] Accepts an `ACCOUNTING_PREVIEW_ORIGINS` entry as an approved origin
    - [x] Never produces an `http` target when the forwarded protocol is `https`
    - [x] `getAccountingCallbackOrigin` reads the configured redirect URI and rejects a malformed value
- [x] Task: Write Accounting auth route Red tests
    - [x] Start route: a malformed `returnTo` restarts the handoff with `returnTo=/`, returns a 307 to the authorize URL, logs one warning, and never returns 500
    - [x] A start request on an approved preview origin redirects to the same path on the callback origin with `returnTo` preserved
    - [x] Callback: an identity without an Accounting audience role redirects to `/login?error=forbidden`
    - [x] Callback failure paths redirect with `?error=sso` and expire the transaction cookie, including the missing-transaction path
    - [x] Session route: a no-role identity already receives HTTP 403 today; the Red delta is that the 403 body is `{"session": null, "denied": true}` (parity with `apps/sales-advantage/app/api/auth/session/route.ts`), while a missing session keeps 401 with `{"session": null}` and a valid session keeps 200 with `{"session": {"user": ...}}`
    - [x] Logout route builds its redirect from the validated public origin
- [x] Task: Write login page and proxy Red tests
    - [x] The login page sign-in link carries the current path and query as encoded `returnTo`
    - [x] The login page renders a visible message for each enumerated error code
    - [x] An unauthenticated protected-page request redirects to `/login` with `returnTo` set through the approved-origin helper
    - [x] No proxy redirect targets an unapproved forwarded host
- [x] Task: Write pipeline, grants, and probe Red tests
    - [x] `apps/accounting/cloudbuild.yaml` parses and contains: image push to the `accounting` registry, a migrate step using `ACCOUNTING_DIRECT_DATABASE_URL`, a doctor step, a grants step, a probe step, and a deploy step with `--tag=candidate` and `--no-traffic`
    - [x] No pipeline step contains a traffic-shift command
    - [x] The `availableSecrets` list names every secret in the secrets contract and no other
    - [x] `accounting-runtime-grants.sql` contains no `ALTER ROLE`, revokes all table privileges from `accounting_runtime` first, grants exactly `SELECT, INSERT, UPDATE` on `accounting_submissions`, grants only `SELECT, INSERT` on `accounting_submission_audit_events` (no UPDATE or DELETE, enforcing append-only), and sets default-privilege revokes
    - [x] The runtime probe connects as `accounting_runtime`, exercises an application query and an audit insert, proves an UPDATE and a DELETE on `accounting_submission_audit_events` are denied, and cleans up its own rows; the negative probe asserts DDL denial
- [x] Task: Write promotion gate and release verifier Red tests
    - [x] `promote-accounting-candidate.sh` passes `bash -n` and exits non-zero when `CANDIDATE_REVISION` or `ACCEPTANCE_NOTE` is missing, empty, or lacks `status: pass`
    - [x] `verify-accounting-release.ts` passes against a stub server returning the contract statuses and fails on a 500, a wrong unauthenticated status, or a missing login page
- [x] Task: Confirm the Red phase
    - [x] Run each new suite and record the failing assertion counts here
    - [x] Commit the test files and this plan only
- [b] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md) deferred:owner

### Phase 2 Red execution record (2026-08-30)

All failures below are intended Red failures for Phase 3 behavior. Contract
tests pass where commit `47860b85b` and corrective commit `e6a78d274` already
provide the behavior.

**Accounting suite** (`accounting`)
- Command: `CI=true pnpm_config_verify_deps_before_run=false pnpm --filter accounting exec vitest run app/lib/__tests__/public-url.test.ts app/lib/__tests__/sign-in-href.test.ts app/api/auth/company/start/route.red.test.ts app/api/auth/callback/route.red.test.ts app/api/auth/logout/route.red.test.ts app/api/auth/session/route.red.test.ts app/login/page.red.test.tsx app/lib/__tests__/proxy.red.test.ts app/lib/__tests__/cloudbuild.red.test.ts app/lib/__tests__/database-access-contract.red.test.ts app/lib/__tests__/promotion.red.test.ts app/lib/__tests__/release-verifier.red.test.ts`
- Failing assertions: 11 across 6 files; 40 assertions pass.
- Nature: the start and callback routes lack the safe fallback, callback-origin handoff, role denial, and complete cookie cleanup. The logout route and proxy still trust unapproved forwarding data. The session body lacks `denied: true`. The login page lacks destination forwarding and both error messages.

**Database suite** (`@reading-advantage/db`)
- Command: `CI=true pnpm_config_verify_deps_before_run=false pnpm --filter @reading-advantage/db exec vitest run src/accounting/__tests__/environment.test.ts src/accounting/__tests__/runtime-client.test.ts src/accounting/__tests__/schema-parity.test.ts src/__tests__/main-schema-accounting-exclusion.test.ts src/__tests__/main-journal-accounting-guard.test.ts`
- Failing assertions: 5 across 3 files; 15 assertions pass.
- Nature: the dedicated `0000` journal is absent, the main schema still exports both Accounting tables, and the tip snapshot still contains Accounting entries. The generated-diff guard runs against a temporary relocation and rejects the stale baseline.

**Tenant registry suite** (`@reading-advantage/domain`)
- Command: `CI=true pnpm_config_verify_deps_before_run=false pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/accounting-tenant-classification.test.ts`
- Failing assertions: 1 across 1 file; 2 assertions pass.
- Nature: the registry still imports the Accounting tables from the main database package entrypoint instead of the dedicated schema entrypoint.

**Static checks**
- Accounting `check-types`: exit 0.
- `@reading-advantage/db` `check-types`: exit 0.

## Phase 3: Implement

- [x] Task: Create the dedicated Accounting database package layout (`e5c789dff`)
    - [x] Add `packages/db/accounting/drizzle.config.ts` mirroring the company-identity config
    - [x] Add `packages/db/src/accounting/environment.ts`, the runtime client factory, and migrate/doctor commands mirroring `src/company-identity/`
    - [x] Add the `accounting:generate`, `accounting:migrate`, and `accounting:doctor` scripts and the runtime client export to `packages/db/package.json`
- [x] Task: Move the Accounting schema, prune the main snapshot, and generate the initial journal (`e5c789dff`)
    - [x] Relocate the two table definitions to `packages/db/src/accounting/schema/index.ts` unchanged
    - [x] Remove the re-export from `packages/db/src/schema/index.ts` and delete the old `src/schema/accounting.ts`
    - [x] Point the tenant registry import at the new accounting schema entrypoint
    - [x] Run `accounting:generate` to produce `packages/db/accounting/drizzle/0000_*.sql` and review it against journal entries `0054` and `0055`; confirm it creates both tables and does NOT carry the hand-written `DO $$ ... REVOKE` block
    - [x] Prune the accounting table, index, and constraint entries from the main-journal snapshot chain tip (`packages/db/drizzle/meta/0056_snapshot.json`) in the same change, so drizzle-kit no longer sees the tables on either side of the diff
    - [x] Run a main `drizzle-kit generate` into a temporary output and confirm it produces no migration referencing either Accounting table; commit no main migration if the generate is empty
    - [x] Add `packages/db/src/__tests__/main-journal-accounting-guard.test.ts` scanning post-relocation main-journal SQL for accounting references
- [x] Task: Point the Accounting app at the dedicated client (`e5c789dff`)
    - [x] Change `apps/accounting/app/lib/submissions.ts` to build its postgres.js client through the accounting runtime factory
    - [x] Update `apps/accounting/app/lib/submissions.test.ts:17`, which mocks `@reading-advantage/db/client`, to mock the new accounting runtime client module instead, and update any other test that stubs the shared client
    - [x] Keep the domain repository injection and raw SQL unchanged
    - [x] Verify the socket-path conversion in `connection-options.ts` serves the accounting URL form; extend it only if the accounting URL shape requires it
- [x] Task: Implement the database role provisioning, grants, and probes (`e5c789dff`)
    - [x] Add `apps/accounting/scripts/accounting-runtime-role-provision.sql` for the one-off privileged creation of `accounting_migration` and `accounting_runtime`
    - [x] Add `accounting-runtime-grants.sql` mirroring the Marketing grants file: CONNECT and schema USAGE grants, REVOKE ALL on existing tables and sequences, `SELECT, INSERT, UPDATE` on `accounting_submissions`, `SELECT, INSERT` only on `accounting_submission_audit_events`, and default-privilege revokes; this is the append-only enforcement that replaces the `0055` DO block
    - [x] Add `accounting-runtime-probe.sql` (owner-namespaced setup, application query, audit insert allowed, audit UPDATE and DELETE denied, cleanup) and the negative DDL probe
- [x] Task: Implement the Accounting public URL helper with origin approval (`e5c789dff`)
    - [x] Create `apps/accounting/app/lib/public-url.ts` porting the Sales helper with the accounting canonical origin and `ACCOUNTING_PREVIEW_ORIGINS`
    - [x] Use the helper in the proxy, callback, start, and logout routes
- [x] Task: Implement the auth route changes (`e5c789dff`)
    - [x] Catch the return-path validation error in the start route, restart with `/`, and log one structured warning
    - [x] Hand off a start that arrives on an approved preview origin to the callback origin, preserving `returnTo`
    - [x] Deny a no-role identity in the callback with `/login?error=forbidden` and expire the transaction cookie on every failure path
    - [x] Answer a no-role session on the session route with HTTP 403 and the `{"session": null, "denied": true}` body
    - [x] Derive the cookie `secure` flag from the resolved target protocol as well as `NODE_ENV`
- [x] Task: Implement the login page and proxy changes (`e5c789dff`)
    - [x] Build the sign-in link from the current path and query in the login page
    - [x] Render the visible message for `sso` and `forbidden`
    - [x] Route the proxy redirect through the public URL helper
- [x] Task: Create the Cloud Build pipeline (`e5c789dff`)
    - [x] Add `apps/accounting/cloudbuild.yaml` per the pipeline contract: build, push, migrate, doctor, grants, probes, candidate deploy with no traffic, invoker binding, candidate capture, and candidate verification
    - [x] Add `apps/accounting/scripts/capture-accounting-cloud-run-tag.sh` mirroring the Sales capture script
    - [x] Wire all `availableSecrets` and the candidate environment from FR-8
- [x] Task: Create the promotion script and release verifier (`e5c789dff`)
    - [x] Add `apps/accounting/scripts/promote-accounting-candidate.sh` with the acceptance-note gate, traffic shift, and production verification
    - [x] Add `apps/accounting/scripts/verify-accounting-release.ts` with the login-page, 401, and safe-redirect checks
- [x] Task: Confirm the Green phase (`e5c789dff`)
    - [x] Run the Accounting and `@reading-advantage/db` suites, `check-types`, and `lint`
    - [x] Run `bash -n` on every new shell script and confirm executable mode
    - [x] Run the focused Turbo build and test gates and record the exit codes honestly

### Phase 3 Green execution record (2026-09-01)

- Implementation checkpoint: `e5c789dff`.
- Migration isolation: the temporary main-journal generate exited 0 and produced no Accounting migration references. The temporary config was deleted.
- Focused Accounting command: `CI=true pnpm_config_verify_deps_before_run=false pnpm --filter accounting exec vitest run app/lib/__tests__/public-url.test.ts app/lib/__tests__/sign-in-href.test.ts app/api/auth/company/start/route.red.test.ts app/api/auth/callback/route.red.test.ts app/api/auth/logout/route.red.test.ts app/api/auth/session/route.red.test.ts app/login/page.red.test.tsx app/lib/__tests__/proxy.red.test.ts app/lib/__tests__/cloudbuild.red.test.ts app/lib/__tests__/database-access-contract.red.test.ts app/lib/__tests__/promotion.red.test.ts app/lib/__tests__/release-verifier.red.test.ts`; exit 0, 12 files and 51 tests passed.
- Focused DB command: `CI=true pnpm_config_verify_deps_before_run=false pnpm --filter @reading-advantage/db exec vitest run src/accounting/__tests__/environment.test.ts src/accounting/__tests__/runtime-client.test.ts src/accounting/__tests__/schema-parity.test.ts src/__tests__/main-schema-accounting-exclusion.test.ts src/__tests__/main-journal-accounting-guard.test.ts`; exit 0, 5 files and 20 tests passed.
- Focused domain command: `CI=true pnpm_config_verify_deps_before_run=false pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/accounting-tenant-classification.test.ts`; exit 0, 1 file and 3 tests passed.
- Full Accounting command: `CI=true pnpm_config_verify_deps_before_run=false pnpm --filter accounting exec vitest run`; exit 0, 29 files and 189 tests passed.
- Type commands: `pnpm --filter accounting check-types`, `pnpm --filter @reading-advantage/db check-types`, and `pnpm --filter @reading-advantage/domain check-types`; each exited 0.
- Lint commands: `pnpm --filter accounting lint`, `pnpm --filter @reading-advantage/db lint`, and `pnpm --filter @reading-advantage/domain lint`; each exited 0 with only existing warnings.
- Shell command: `bash -n apps/accounting/scripts/capture-accounting-cloud-run-tag.sh apps/accounting/scripts/promote-accounting-candidate.sh`; exit 0. Both files pass `test -x`.
- Turbo build command: `CI=true pnpm_config_verify_deps_before_run=false pnpm turbo run build --filter=accounting --filter=@reading-advantage/db --filter=@reading-advantage/domain --env-mode=loose`; exit 0, 20 tasks passed. The first strict-environment attempt stopped on unrelated `apps/primary-advantage/package.json` lockfile drift.
- Turbo test command: `CI=true pnpm_config_verify_deps_before_run=false pnpm turbo run test --filter=accounting --filter=@reading-advantage/db --filter=@reading-advantage/domain --continue --env-mode=loose`; exit 1. Accounting passed. DB and domain retained baseline failures described below.
- Baseline proof used clean detached worktree `/tmp/opencode/accounting-baseline-fa3f11` at `fa3f11edb7c55f260b2dd49dd990c05790dc8c3e`. Its status was clean.
- The baseline DB suite exited 1 with the same `standard_pack_successor_commitments is append-only` signature.
- The baseline domain suite exited 1 with the same phase-4, Sales Mastery append-only, and duplicate `users_pkey` signatures.
- The implicated mastery, phase-4, users, games, and test-harness files have no diff from the baseline.
- Authorized test corrections changed `packages/db/src/accounting/__tests__/schema-parity.test.ts`, `packages/db/src/__tests__/accounting-schema.test.ts`, and `apps/accounting/app/api/auth/session/route.test.ts` only. These corrections align stale expectations with the accepted contracts.
- [b] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md) deferred:owner

## Phase 4: Generate Docs & Doctor

- [b] Task: Provision the GCP resources deferred:owner
    - [ ] Enable the required APIs in project `reading-advantage`
    - [ ] Create the `accounting` Artifact Registry repository in `asia-southeast1`
    - [ ] Create the `accounting-cloud-run` runtime service account and grant Secret Manager access plus `roles/cloudsql.client`
    - [ ] Grant the Cloud Build service account `roles/run.admin` and `roles/iam.serviceAccountUser`
    - [ ] Create the dedicated `accounting` database on the shared `cloud-sql` instance
    - [ ] Provision `accounting_migration` and `accounting_runtime` from a privileged workstation and run the grants file
    - [ ] Create the nine `ACCOUNTING_*` secrets from the secrets contract (`ACCOUNTING_DIRECT_DATABASE_URL`, `ACCOUNTING_DATABASE_URL`, `ACCOUNTING_COMPANY_AUTH_OIDC_CLIENT_SECRET`, six `ACCOUNTING_STORAGE_*`), mapping the storage secrets to unprefixed `STORAGE_*` env vars in Cloud Run
    - [ ] Confirm the `accounting-web` OIDC client secret value matches the Accounts bootstrap registration
- [b] Task: Deploy the candidate and run candidate acceptance deferred:owner
    - [ ] Submit `apps/accounting/cloudbuild.yaml` with the reviewed commit and wait for the no-traffic candidate
    - [ ] Run the unauthenticated, malformed-return, and preview-handoff cases against the candidate URL and capture the redirect chains
    - [ ] Complete a sign-in with an Accounting identity through the callback origin and confirm the session cookie
    - [ ] Confirm the forbidden case with a no-role identity
    - [ ] Write the acceptance note with `status: pass` and attach screenshots
- [b] Task: Promote, wire DNS, and run production smoke deferred:owner
    - [ ] Run `promote-accounting-candidate.sh` only after the acceptance note passes
    - [ ] Create the domain mapping for `accounting.reading-advantage.com` and update the Squarespace DNS record
    - [ ] Run the production smoke cases: 2xx home, 401 unauthenticated API, 307 malformed return, authenticated expense submission with evidence
    - [ ] Confirm no new Cloud Run error logs during the smoke window
    - [ ] Keep the previous revision as the rollback anchor and record its revision name
- [ ] Task: Create documentation
    - [ ] Create `apps/accounting/docs/accounting-dedicated-db-deploy-runbook-20260830.md` with the topology decision, provisioning commands, secrets, role provisioning, candidate and promotion flow, DNS, rollback anchor, the append-only grants contract, the export-and-import contingency, and the main-journal snapshot-pruning procedure for any future table relocation out of the main schema
- [ ] Task: Run the generated-facts and architecture gates
    - [ ] Run `measure/generate.sh`
    - [ ] Run `measure/doctor.sh`
    - [ ] Run `build-graph update ./graph.db` for the changed files
- [ ] Task: Retrospective
    - [ ] Add a lesson: a bounded product database follows the company-identity layout (own journal, own client, own roles, own secrets) on the shared instance; the main product client is never reused for a bounded product
    - [ ] Reference the existing tech-debt row for the shared cross-app public-URL helper; this track adds another per-app copy, not the shared package
- [b] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md) deferred:owner

## Checkpoints

Record a commit SHA only after the commit is an ancestor of HEAD.

- Phase 1 contracts: `e6a78d274`
- Phase 2 Red: `6471822de`
- Phase 3 Green: pending
- Phase 4 docs and doctor: pending
