# Test Strategy: Wave 2 — Restore Deployment/Test/Provider Confidence

Track: `wave2_confidence_restoration_20260628`  
Baseline SHA: `af631ec9f534250bec6ba39ac28a678bb9f2042b`  
Role: Measure Strategy. Scope is test strategy plus Phase 0 baseline inventory only; no product fixes or product tests authored here.

## Phase 0 baseline inventory and graph evidence

### Required source/evidence read

Read before strategy authoring: `measure/index.md`, `measure/tracks.md`, this track's `spec.md` and `plan.md`, `measure/anti-patterns.md`, roadmap `deduplicated-findings.md` and `test-strategy-roadmap.md`, cross-app `findings.md`, shared-foundation `executive-summary.md`, app executive summaries for Science, CodeCamp, Marketing, Sales, and Games, plus Wave 0/Wave 1 archived `test-strategy.md` format references.

### Graph/source probe

- Branch verified: `docs/measure-wave4-6-medium-coverage`.
- Baseline SHA verified: `af631ec9f534250bec6ba39ac28a678bb9f2042b`.
- `build-graph stats ./graph.db`: **22,424 nodes / 46,200 edges / 2,722 files**.
- Relevant graph/source facts inspected:
  - `packages/db/src/sentinels.ts` now contains probes through `0024_futuristic_vulture`.
  - `packages/db/scripts/migration-ledger-doctor.ts` exists and is wired as `@reading-advantage/db#doctor`.
  - `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts` exists and currently guards direct `from "ai"` / `from "@ai-sdk/*"` app imports.
  - `packages/ai/src/index.ts` still re-exports raw SDK/provider functions (`createOpenAI`, `createGoogleGenerativeAI`, `createVertex`, `generateObject`, `generateText`, `streamText`, `experimental_generateImage`) through the adapter barrel. Phase 2 must address this Wave 2-specific leak.
  - `packages/storage/src/index.ts` exports the `StorageClient`/factory/S3 driver seam; storage contract tests exist.

### Script inventory across apps and shared packages

Labeled counts from package manifest inventory:

- **Workspace package count:** 21
- **App count:** 8
- **Shared package count:** 13
- **Missing lint script count:** 2 (`@reading-advantage/config`, `@reading-advantage/scripts`)
- **Missing check-types script count:** 4 (`@reading-advantage/config`, `@reading-advantage/scripts`, `@reading-advantage/ui`, `@reading-advantage/utils`)
- **Missing test script count:** 0
- **Missing build script count:** 2 (`@reading-advantage/config`, `@reading-advantage/scripts`)
- **`passWithNoTests` script count:** 3 (`codecamp-advantage`, `sales-advantage`, `@reading-advantage/scripts`)

| Scope | Package | lint | check-types | test | build | Inventory note |
|---|---|---:|---:|---:|---:|---|
| app | `vocabulary-games` | yes | yes | `jest` | yes | Games still have smoke-heavy coverage debt from review. |
| app | `codecamp-advantage` | yes | yes | `vitest run --passWithNoTests` | yes | Vacuous-pass risk; prod-smoke tests live-hit by default. |
| app | `marketing` | yes | yes | `vitest run` | yes | Review found stale RED docblocks/tautological tests. |
| app | `primary-advantage` | yes | yes | `vitest run` | yes | PR CI path does not trigger on this app. |
| app | `reading-advantage` | yes | yes | `jest` | yes | PR CI path does not trigger on this app; known legacy aggregate red from Wave 1. |
| app | `sales-advantage` | yes | yes | `vitest run --passWithNoTests` | yes | Vacuous-pass risk; `check-types` currently fails TS2742 in `lib/trpc.ts`. |
| app | `science-advantage` | yes | yes | `vitest run` | yes | PR CI path includes this app; seed governance still in Wave 2 scope. |
| app | `www-reading-advantage` | yes | yes | `vitest run` | yes | PR CI path does not trigger on this app. |
| package | `@reading-advantage/ai` | yes | yes | `vitest run` | yes | Aggregate test intentionally red from stale artifact/version tests; direct app import guard passes. |
| package | `@reading-advantage/api` | yes | yes | `vitest run` | yes | Wave 0/Wave 1 targeted tests now exist. |
| package | `@reading-advantage/auth` | yes | yes | `vitest run` | yes | Historical integration tests require DB; timeout-prone in review artifacts. |
| package | `@reading-advantage/auth-client` | yes | yes | `vitest run` | yes | Contract tests exist. |
| package | `@reading-advantage/config` | no | no | `vitest run` | no | Good home for meta-gate tests, but lacks lint/build/check-types. |
| package | `@reading-advantage/db` | yes | yes | `vitest run` | yes | Migration/journal/ledger guard suite exists through 0024. |
| package | `@reading-advantage/domain` | yes | yes | `vitest run` | yes | Tenant/auth/codecamp/sales Wave 0/1 tests now exist. |
| package | `@reading-advantage/scripts` | no | no | `jest --passWithNoTests` | no | Legacy vacuous package; must be excluded from quality claims or given real tests. |
| package | `@reading-advantage/storage` | yes | yes | `vitest run` | yes | 12 storage tests pass at baseline. |
| package | `@reading-advantage/types` | yes | yes | `vitest run` | yes | Wave 0 resolved zero-test finding: 4 files / 88 tests pass. |
| package | `@reading-advantage/ui` | yes | no | `vitest run` | yes | No package check-types script. |
| package | `@reading-advantage/utils` | yes | no | `vitest run` | yes | No package check-types script. |
| package | `@reading-advantage/webhooks` | yes | yes | `vitest run` | yes | Tests pass while logging DB `ECONNREFUSED` in background review path; treat as false-green risk. |

### Baseline gate results

| Baseline command | Result | Labeled finding summary |
|---|---|---|
| `CI=true pnpm test` | Pass | **Root CI test file count: 4**, **root CI test count: 27**. This is a narrow CodeCamp cold-start/local-image subset, not a monorepo test aggregate. |
| `pnpm --filter @reading-advantage/db exec vitest run src/__tests__/journal-integrity.test.ts src/__tests__/snapshot-drift.test.ts src/__tests__/ledger-doctor.test.ts src/__tests__/stale-ledger.test.ts src/__tests__/drizzle045-migration-format.test.ts` | Pass | **DB governance file count: 5**, **passed file count: 3**, **skipped file count: 2**, **passed test count: 76**, **skipped test count: 4**. Migration guards exist through `0024`. |
| `pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/phase-arch-no-direct-sdk.test.ts` | Pass | **Direct app AI SDK import hit count: 0** for that guard, but **AI barrel raw re-export count: 7** by source inspection in `packages/ai/src/index.ts`; Phase 2 must make the barrel leak fail. |
| `pnpm turbo run test --filter=@reading-advantage/types` | Pass | **Types test file count: 4**, **types test count: 88**. Wave 0 already resolved the shared-types zero-test finding. |
| `CI=true pnpm turbo run test --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api --filter=@reading-advantage/ai --filter=@reading-advantage/storage --filter=@reading-advantage/webhooks` | Fail | Shared aggregate is red because `@reading-advantage/ai` reports **failed test count: 19** (**failed file count: 3**, **passed test count: 190**, **skipped test count: 3**). `@reading-advantage/webhooks` passes **8 files / 82 tests** while stderr logs DB `ECONNREFUSED`; that is a false-green risk, not live proof. |
| `CI=true pnpm turbo run check-types --filter=sales-advantage` | Fail | **Sales check-types error count: 2**, both TS2742 in `apps/sales-advantage/lib/trpc.ts`. This is pre-existing and out of Wave 2 unless provider/test gates touch it. |

### CI and exclusion baseline

- Root CI workflow PR path filter includes `apps/science-advantage/**`, `packages/**`, workflow/config files, and root lock/config files.
- **PR path-excluded app directory count: 7** (`reading-advantage`, `primary-advantage`, `codecamp-advantage`, `sales-advantage`, `marketing`, `www-reading-advantage`, `advantage-games`). Pushes to `master` run, but PRs that touch only those app directories do not trigger the root CI workflow.
- Root CI `Test` step runs `pnpm test`, which currently runs only 4 CodeCamp cold-start/local image tests rather than `pnpm turbo run test`.
- **CI aggregate-test exclusion count: 20 package/app test scripts** are not directly invoked by root `pnpm test`.

### Live-production and timeout baseline

- **CodeCamp prod-smoke test file count:** 14
- **CodeCamp prod-smoke files with live `https://codecamp.reading-advantage.com` default count:** 15 (14 test files plus `report-summary.json`)
- Live default examples: `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-1-infrastructure.test.ts` through `phase-13-production-readiness-report.test.ts` use `process.env.PHASE*_PROD_URL ?? "https://codecamp.reading-advantage.com"` or equivalent.
- **Observed Phase 0 command timeout count:** 0 in this strategy run.
- **Known timeout-prone historical gate count:** 2 classes from read artifacts: shared-foundation auth integration tests timed out at 120s; Wave 1 aggregate previously hit API timeout failures. Treat new long-running gate design as suspect unless it has a targeted command and a timeout budget.

### Aggregate-suite policy for Wave 2

The shared aggregate is intentionally red at Phase 0. Wave 2 agents must not hide this by adding `.skip`, broad filters, `passWithNoTests`, or text that claims aggregate green. A phase can pass only when its targeted Red/Green command exits 0 and no new aggregate failures are introduced relative to this baseline. Closeout may accept remaining aggregate red only when each failure has a labeled owner and is not one of this track's acceptance criteria.

Artifact/documentation tests can block Green, but they do not prove live behavior. Live behavior proof for this wave means the relevant command executes code paths that would fail on missing migration sentinels, seed contract drift, direct provider calls, accidental live prod smoke, or empty/vacuous test suites.

## Phase gates

### Phase 0 — Baseline Gate Inventory

**Targeted inventory commands already run:**

```bash
git rev-parse --abbrev-ref HEAD && git rev-parse HEAD && build-graph stats ./graph.db
node <package-script-inventory>
CI=true pnpm test
pnpm --filter @reading-advantage/db exec vitest run src/__tests__/journal-integrity.test.ts src/__tests__/snapshot-drift.test.ts src/__tests__/ledger-doctor.test.ts src/__tests__/stale-ledger.test.ts src/__tests__/drizzle045-migration-format.test.ts
pnpm --filter @reading-advantage/ai exec vitest run src/__tests__/phase-arch-no-direct-sdk.test.ts
pnpm turbo run test --filter=@reading-advantage/types
CI=true pnpm turbo run test --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api --filter=@reading-advantage/ai --filter=@reading-advantage/storage --filter=@reading-advantage/webhooks
CI=true pnpm turbo run check-types --filter=sales-advantage
```

**Red expectations / falsification conditions:** Phase 0 is falsified if the strategy lacks labeled counts for script gaps, vacuous scripts, live prod-smoke defaults, CI exclusions, and aggregate failures; or if plan Phase 0 is marked complete without the evidence above.

**Green gate:** `test-strategy.md` records the inventory and `plan.md` marks only Phase 0 tasks `[x]` with evidence. No product source changed.

**Closeout gate:** `git diff -- measure/tracks/wave2_confidence_restoration_20260628` shows only `test-strategy.md` and Phase 0 evidence in `plan.md`.

**Fixtures/mocks/live proof:** Phase 0 uses read-only package/script/source inventory plus targeted existing guard commands. It is not live product proof for later phases.

**Architecture guardrails / changed-contract risks:** none; no product contracts changed.

**Anti-pattern coverage:** A3 labeled counts in every inventory row; A4 Phase 0 cannot pass with zero evidence commands; A5 no aggregate-green claim while shared aggregate is red; A6 no registry/product readiness update; A7 inventory filters are path/extension-specific, not broad prose filters; A8 only completed Phase 0 tasks become `[x]`; A9 prior archived strategy docs are references only; A10 graph facts are recorded but no graph update is needed because no source changed; A11 not a review track and no tasks are blocked.

### Phase 1 — Migration and Seed Governance

**Targeted Red command (after Red tests are authored):**

```bash
CI=true pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/journal-integrity.test.ts \
  src/__tests__/snapshot-drift.test.ts \
  src/__tests__/ledger-doctor.test.ts \
  src/__tests__/stale-ledger.test.ts \
  src/__tests__/deploy-gate-contract.test.ts \
  src/__tests__/drizzle045-migration-format.test.ts \
  src/__tests__/codecamp-stale-seed.test.ts \
  src/__tests__/wave2-migration-seed-governance.test.ts && \
CI=true pnpm --filter science-advantage exec vitest run \
  tests/lib/seed-validation.test.ts \
  tests/wave2-grade4-seed-contract.test.ts && \
CI=true pnpm --filter sales-advantage exec vitest run \
  scripts/__tests__/wave2-sales-curriculum-seed-contract.test.ts
```

**Red expectations / falsification conditions:**

- Migration sentinel parity fails with `Missing sentinel count: N` when any journal entry through the latest migration lacks a sentinel probe. It must fail if `0022`, `0023`, or `0024` are removed from `sentinelProbes` or `_journal.json`.
- Ledger doctor fails with `Ledger divergence count: N` when schema artifacts exist without matching `drizzle.__drizzle_migrations` rows or ledger rows exist without schema artifacts. It must not require production DB credentials for unit simulation; live `DIRECT_DATABASE_URL` proof is optional.
- Deploy doctor fails with `Required migration behind count: N` when an app declares a minimum migration newer than the ledger.
- Science grade-4 seed contract fails with `Invalid grade-4 seed item count: N` if the seeder's Zod input rejects fixture data or omits `schoolId` where required.
- CodeCamp seed drift test fails with labeled duplicate/key counts before any destructive backfill path; duplicates must be represented with deterministic fixtures, not live prod data.
- Sales curriculum seed contract fails with `Orphan lesson count: N` / `Draft-visible lesson count: N` for known seed drift classes. If Sales remains single-tenant/global, the test must assert that explicitly rather than invent `schoolId` semantics.

**Green gate:** targeted command exits 0; `pnpm --filter @reading-advantage/db doctor -- --check` either exits 0 against a configured test DB or exits 2 with a labeled `DIRECT_DATABASE_URL missing` skip that cannot satisfy live deploy proof; no migration SQL/journal drift is present.

**Closeout gate:**

```bash
CI=true pnpm turbo run test --filter=@reading-advantage/db --filter=science-advantage --filter=codecamp-advantage --filter=sales-advantage
CI=true pnpm turbo run check-types --filter=@reading-advantage/db --filter=science-advantage --filter=codecamp-advantage --filter=sales-advantage
```

Known pre-existing `sales-advantage` TS2742 may remain only if unchanged and linked in phase evidence; Phase 1 cannot close with any migration/seed-targeted Red test still failing.

**Fixtures/mocks/live proof:** use fake journal/ledger fixtures for unit tests; use isolated in-memory/file fixtures for grade-4, CodeCamp, and Sales seeds; live DB proof requires `DIRECT_DATABASE_URL` and must be clearly labeled as live. No production DB reads.

**Architecture guardrails / changed-contract risks:** direct migration code must use `DIRECT_DATABASE_URL`, not pooled `DATABASE_URL`; do not hand-write unreviewed SQL; seed validation belongs before insert/upsert; deploy gates must fail closed instead of warning.

**Anti-pattern coverage:** A3 labeled integer counts for sentinel/ledger/seed failures; A4 seed suites fail if fixture case count is 0 or all invalid cases are skipped; A5 plan text cannot say migration governance is green until the targeted command exits 0; A6 no `tracks.md` overstatement; A7 filters may exclude generated snapshots by path only, not broad words; A9 tests referencing prior migration tracks must use archive-aware resolution; A10 any migration/schema export changes require `build-graph update`; A11 not applicable beyond truthful plan markers.

### Phase 2 — Provider Adapter Enforcement

**Targeted Red command (after Red tests are authored):**

```bash
CI=true pnpm --filter @reading-advantage/ai exec vitest run \
  src/__tests__/wave2-ai-barrel-no-raw-sdk.test.ts \
  src/__tests__/wave2-provider-architecture-guard.test.ts \
  src/__tests__/phase-arch-no-direct-sdk.test.ts \
  src/__tests__/phase-stream-text-contract.test.ts \
  src/__tests__/phase-multimodal-contract.test.ts && \
CI=true pnpm --filter @reading-advantage/storage exec vitest run \
  src/__tests__/wave2-storage-contract.test.ts \
  src/__tests__/factory.test.ts \
  src/__tests__/s3-driver.test.ts \
  src/__tests__/urls.test.ts && \
CI=true pnpm --filter @reading-advantage/config exec vitest run \
  src/__tests__/wave2-observability-provider-guard.test.ts
```

**Red expectations / falsification conditions:**

- AI barrel guard is Red at baseline: `Raw AI barrel export count: 7` from `packages/ai/src/index.ts`. Green requires production consumers import adapter-owned functions/classes only, or raw SDK exports are quarantined under an explicit test-only path that production code cannot import.
- Provider architecture guard fails on direct production imports of `openai`, `@ai-sdk/*`, `ai`, `@google-cloud/storage`, `firebase-admin/storage`, `@sentry/nextjs`, or raw OpenTelemetry/Sentry capture APIs outside allowlisted adapter/config files. It is falsified by any unapproved hit or by scan count `Scanned production file count: 0`.
- Storage contract fails if `StorageClient` lacks put/get/delete/signed URL semantics or if rejected/failed operations leak provider-specific errors instead of adapter errors.
- Observability guard fails if production app/domain code calls `console.*` for production error paths or direct Sentry capture outside an adapter. Until a shared observability package exists, the guard may allow app bootstrap/config files but must require a named allowlist reason.
- Adapter behavior tests must prove mocked AI/storage providers are called on valid paths and not called on validation failures. Source scans alone cannot close Phase 2.

**Green gate:** all targeted commands exit 0; `CI=true pnpm turbo run check-types --filter=@reading-advantage/ai --filter=@reading-advantage/storage --filter=@reading-advantage/config` exits 0 or documents `@reading-advantage/config` lacking a check-types script as a script-inventory gap, not behavior proof.

**Closeout gate:**

```bash
CI=true pnpm turbo run test --filter=@reading-advantage/ai --filter=@reading-advantage/storage --filter=@reading-advantage/webhooks --filter=reading-advantage --filter=primary-advantage --filter=science-advantage --filter=marketing --filter=sales-advantage --filter=codecamp-advantage
CI=true pnpm turbo run lint --filter=@reading-advantage/ai --filter=@reading-advantage/storage --filter=@reading-advantage/webhooks
```

Remaining legacy direct provider imports are allowed only with a follow-up row naming the path, provider, reason, and owner wave; the guard must continue failing for newly introduced unapproved hits.

**Fixtures/mocks/live proof:** use `MockProvider`, fake storage driver, and fake logger/capture adapter. No real AI/storage/Sentry calls; live provider calls are optional smoke tests and never a default CI gate.

**Architecture guardrails / changed-contract risks:** do not re-export vendor SDKs through `@reading-advantage/ai`; do not make apps depend on provider SDK construction; observability must be adapter/configured boundary, not domain route code; storage provider errors should be normalized.

**Anti-pattern coverage:** A1/A7 static guards inspect import declarations/precise strings, not prose substrings or broad `rg -v` filters; A3 label raw-export/hit/scanned counts; A4 fail on zero scanned files or zero contract cases; A5 no claim that adapters are enforced while barrel leak remains; A6 registry notes only after guard green; A9 allowlists may not point only to archived paths; A10 update graph for exported adapter/barrel changes; A11 not applicable.

### Phase 3 — Test Signal Restoration

**Targeted Red command (after Red tests are authored):**

```bash
CI=true pnpm --filter @reading-advantage/config exec vitest run \
  src/__tests__/wave2-test-signal-inventory.test.ts && \
CI=true pnpm --filter codecamp-advantage exec vitest run \
  lib/__tests__/prod-smoke/wave2-live-smoke-opt-in.test.ts && \
CI=true pnpm --filter marketing exec vitest run \
  app/__tests__/wave2-test-truthfulness.test.ts && \
CI=true pnpm turbo run test --filter=@reading-advantage/types
```

**Red expectations / falsification conditions:**

- Test-signal inventory fails with `PassWithNoTests quality-claim count: N` if `--passWithNoTests` appears in any script that root CI or a completion claim treats as quality proof. Baseline hit count is 3.
- CodeCamp live-smoke opt-in test fails while prod-smoke tests default to `https://codecamp.reading-advantage.com` without `RUN_LIVE_SMOKE=true` (or equivalent) and without explicit live credentials. Baseline live-default file count is 15.
- Marketing truthfulness tests fail on stale `RED at HEAD` docblocks, contradictory credential-leak comments, tautological assertions that do not exercise behavior, or DOM tests running in a Node-only environment.
- `@reading-advantage/types` must remain a real test-bearing package. This finding is already resolved by Wave 0; Phase 3 must protect against regression with `Types test file count: >=4` and `Types test count: >=88` or intentionally updated labeled counts.
- Any test that uses source text must include an injected counterexample fixture so it can prove the guard would fail on the bad pattern.

**Green gate:** targeted command exits 0; `passWithNoTests` is removed from quality-claim paths or explicitly quarantined as non-quality; live prod-smoke tests skip locally/CI unless `RUN_LIVE_SMOKE=true` and a URL/credential contract is present; Marketing tests exercise behavior or are marked as artifact-only.

**Closeout gate:**

```bash
CI=true pnpm test
CI=true pnpm turbo run test --filter=@reading-advantage/types --filter=codecamp-advantage --filter=marketing --filter=@reading-advantage/config
```

If root `pnpm test` remains intentionally narrow, closeout must say so and must not call it a monorepo aggregate.

**Fixtures/mocks/live proof:** use static script inventory fixtures for artifact tests; use fake fetch/server handlers for CodeCamp opt-in tests; use Testing Library/jsdom or route-level behavior tests for Marketing. Live smoke proof is opt-in only and not required for Green unless credentials/flag are supplied.

**Architecture guardrails / changed-contract risks:** do not delete prod-smoke value; quarantine it behind explicit opt-in. Do not replace bad tests with no tests. Do not lower root CI signal by keeping `pnpm test` narrow without documentation and a follow-up owner.

**Anti-pattern coverage:** A3 parse labeled counts for passWithNoTests/live-default/tautology hits; A4 tests fail if no package scripts or no prod-smoke files are scanned; A5 stale RED docblocks and claims are direct targets; A6 completion/registry text must match live gate results; A7 filters may exclude test fixtures by path marker only; A8 plan markers remain pending until Red/Green evidence; A9 archived-path references in test docs need resolver; A10 generated-fact updates if CI/script structure changes; A11 not applicable.

### Phase 4 — Reusable Harnesses

**Targeted Red command (after Red tests are authored):**

```bash
CI=true pnpm --filter @reading-advantage/domain exec vitest run \
  src/__tests__/wave2-tenant-isolation-harness.test.ts && \
CI=true pnpm --filter @reading-advantage/api exec vitest run \
  src/__tests__/wave2-api-contract-kit.test.ts && \
CI=true pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/wave2-migration-doctor-helper.test.ts && \
CI=true pnpm --filter @reading-advantage/ai exec vitest run \
  src/__tests__/wave2-provider-guard-utility.test.ts && \
CI=true pnpm --filter www-reading-advantage exec vitest run \
  __tests__/wave2-product-claim-helper.test.ts
```

**Red expectations / falsification conditions:**

- Tenant isolation harness fails if it does not construct two schools and at least one cross-school adversarial case. Falsified by `School fixture count < 2` or `Cross-tenant rejection count: 0`.
- API contract kit fails if it cannot assert success envelope, validation error, unauthenticated, wrong-role, forbidden, not-found, and conflict/error cases against a sample router/route.
- Provider guard utility fails if an injected forbidden import shape is not detected, including namespace imports, require/dynamic import, and barrel re-export leaks.
- Migration doctor helper fails if it cannot simulate fresh DB, existing DB, schema-present/ledger-missing, and ledger-present/schema-missing cases without live credentials.
- Product-claim helper fails if it cannot distinguish app-existence claims, stale launch dates, placeholder case studies, and allowed policy/disclaimer lines. Claims helpers are artifact tests unless paired with a rendered page or route check.
- Every helper must have at least one consumer test in this phase; a helper with no consumer is not Green.

**Green gate:** all targeted harness tests pass; helper APIs are documented in code/JSDoc or test examples; at least one real consumer per helper exists.

**Closeout gate:**

```bash
CI=true pnpm turbo run test --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/db --filter=@reading-advantage/ai --filter=www-reading-advantage
CI=true pnpm turbo run check-types --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/db --filter=@reading-advantage/ai --filter=www-reading-advantage
```

**Fixtures/mocks/live proof:** deterministic two-school fixtures; fake tRPC/route callers; synthetic import fixtures; fake migration ledgers; fake product page/claim matrices. No live provider or production web calls.

**Architecture guardrails / changed-contract risks:** helpers belong in shared packages or test utilities, not app-specific copy-paste; they must not pull Next/tRPC transport types into domain helpers; product-claim helpers must not mutate public copy.

**Anti-pattern coverage:** A1 provider/claim helpers parse structured AST/fixtures instead of substring truth; A2 product-claim publish helpers require consent/anonymization proof for case-study publishing tests; A3 all helper diagnostics use labeled counts; A4 fail on zero consumers/zero fixtures; A5 helpers include counterexamples to refute false claims; A7 exact allowlists only; A9 archived path resolver included for Measure artifact tests; A10 graph update for new exported helpers; A11 not applicable.

### Phase 5 — Aggregate Verification and Closeout

**Targeted Red command:** rerun the Phase 0 shared aggregate and root CI-test command to prove current truth before closeout.

```bash
CI=true pnpm test
CI=true pnpm turbo run test --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api --filter=@reading-advantage/ai --filter=@reading-advantage/storage --filter=@reading-advantage/webhooks
```

**Green gate:**

```bash
CI=true pnpm turbo run lint --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api --filter=@reading-advantage/ai --filter=@reading-advantage/storage --filter=@reading-advantage/webhooks
CI=true pnpm turbo run check-types --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api --filter=@reading-advantage/ai --filter=@reading-advantage/storage --filter=@reading-advantage/webhooks
CI=true pnpm turbo run test --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api --filter=@reading-advantage/ai --filter=@reading-advantage/storage --filter=@reading-advantage/webhooks
CI=true pnpm turbo run test --filter=codecamp-advantage --filter=marketing --filter=science-advantage --filter=sales-advantage --filter=www-reading-advantage --filter=vocabulary-games
```

**Closeout gate:**

- All Phase 1-4 targeted commands pass.
- Migration doctor/sentinel tests catch missing migrations and seed violations.
- Provider guard catches AI/storage/observability direct SDK imports and AI barrel leaks.
- `@reading-advantage/types` still has a real test script and real tests.
- Live production smoke tests are opt-in and cannot hit production in CI without explicit flags/credentials.
- Each reusable harness has one consumer test.
- `measure/audit-reports/monorepo-review-roadmap_20260626/test-strategy-roadmap.md` and `measure/lessons-learned.md` may be updated by the implementation/closeout roles only after behavior gates pass; strategy role does not edit them.

**Intentionally-red aggregate-suite handling:**

- Baseline shared aggregate red is currently dominated by `@reading-advantage/ai` stale artifact/version tests (**19 failed tests**). Phase 5 must either fix/quarantine them honestly as artifact tests or keep them in a known-failure list; it may not claim aggregate green.
- CodeCamp prod-smoke failures are expected until Phase 3 makes them opt-in; after Phase 3, default CI must not hit production.
- Webhooks passing while logging DB `ECONNREFUSED` is not live proof; either assert and eliminate the background DB attempt or record it as an intentionally red/known false-green follow-up.
- Sales TS2742 is pre-existing; if still present, closeout must state it by file/error count and confirm Wave 2 did not worsen it.

**Artifact/documentation vs live behavior:**

- Artifact tests: package-script inventory, source import scans, migration journal/sentinel parity, Measure/path claim scans, stale RED docblock scans.
- Live behavior tests: migration doctor against fake/live ledger, seed validators executing real Zod schemas, provider/storage mocked contract execution, prod-smoke opt-in preventing real fetch, harness consumer tests running two-school/API/contract cases.
- No phase may satisfy acceptance with artifact tests alone when the spec calls for behavior proof.

**Architecture guardrails / changed-contract risks:** do not broaden Wave 2 into app-feature fixes; do not change deployment config without rollback plan; do not add framework upgrades; do not stage unrelated untracked Measure tracks; keep product code changes for Red/Green roles only.

**Anti-pattern coverage:** A2 consent/anonymization required if product-claim/case-study publish helpers touch publish state; A3 closeout parses labeled counts for fixed/deferred/known-red categories; A4 acceptance fails if any phase has zero targeted tests/consumers; A5 every closeout claim cites a command and exit status; A6 registry/roadmap notes avoid `resolved` until adversarial tests pass; A7 no broad filters in aggregate failure triage; A8 Phase 0 `[x]` only for completed strategy inventory, implementation tasks remain pending until executed; A9 tests must resolve active/archive Measure paths; A10 update `graph.db` after exported helpers/barrels/import structures change; A11 not a review track, but do not leave executed Wave 2 work marked fully blocked.

## Handoff order for phased TDD

1. **Mid-Red Phase 1 first:** author `wave2-migration-seed-governance.test.ts`, `wave2-grade4-seed-contract.test.ts`, and `wave2-sales-curriculum-seed-contract.test.ts`. Start with the migration sentinel/ledger tests because `packages/db` already has the strongest guard suite and current migrations run through 0024.
2. **Phase 2:** make the AI barrel leak (`packages/ai/src/index.ts`) Red before changing exports; then extend provider guards to storage and observability.
3. **Phase 3:** convert `passWithNoTests` and CodeCamp prod-smoke live defaults into failing tests; protect the already-fixed `@reading-advantage/types` tests from regression.
4. **Phase 4:** extract reusable harnesses only after Phases 1-3 reveal the stable assertions; require one consumer per helper.
5. **Phase 5:** aggregate verification, documentation updates, lessons learned, and closeout with exact known-red disposition.
