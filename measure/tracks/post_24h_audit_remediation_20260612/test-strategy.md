# Test Strategy: Post-24h Audit Remediation

Scope: remediate audit findings across `packages/db`, `packages/auth`, `packages/api`, `packages/webhooks`, and `packages/domain/codecamp`. Phases 1–4 are largely [x]; this strategy governs the still-[ ] cleanup work (FR-7 partial, FR-8..FR-15, FR-16..FR-19) and the closeout gates.

## 1. Testing Pyramid Per Phase

| Phase | Base (unit / contract) | Mid (integration) | Top (e2e / live) |
|-------|------------------------|-------------------|------------------|
| 1 — DB Ledger Rescue | journal-integrity, barrel-hygiene, package-esm-smoke (all Green) | env-guards subprocess | stale-ledger, ledger-doctor (live PG, opt-in via `PG_TEST_URL`) |
| 2 — Auth Cleanup | session.ts unit, password unit, AuthError type-narrowing unit | reset-password route w/ mocked db, register route | none required |
| 3 — Webhooks Closeout | github-client unit | phase-6-acceptance (requires built `@reading-advantage/db`) | phase-7-closeout = artifact/doc contract only |
| 4 — Codecamp Progress | progress.ts unit (mocked db) | dashboard-cache integration | warm-dashboard latency probe (prod-only, deferred) |
| 5 — Cross-Cutting Hygiene | none | none | `.gitignore` / stash / tracks.md artifact contracts |
| 6 — Final Verification | all package units | all package integrations | full `turbo test --filter` matrix |

Default ratio target: ~70% unit / ~25% integration / ~5% live. Do not add new top-of-pyramid tests in this remediation; prefer hardening existing ones.

## 2. Shared Fixtures and Mocks

- **Mock DB**: `packages/domain/src/__tests__/mock-db.ts` — reused for `progress.ts` and any new domain-level test. Never spin up real Postgres for unit tests.
- **Subprocess harness**: established in `packages/db/src/__tests__/env-guards.test.ts` — reused as the canonical pattern for ESM/runtime guard proofs. Do not regress to source-regex.
- **`sentinelProbes` source-of-truth**: import from `packages/db/scripts/sentinels.ts` (TS), never from the compiled `.js`. Both files exist in the graph today; FR-3 mandates the `.ts` path.
- **Session fixtures**: `packages/auth/src/__tests__/session.test.ts` already mocks `db` with `vi.fn()`. Reuse for FR-5/FR-6/FR-8/FR-9.
- **`AuthError` typed assertions**: helper `expectAuthError(err, code)` should live with `packages/auth/src/errors.ts` consumers — reuse rather than duplicate.
- **Audit-event mock**: capture into an in-memory array; the test asserts `console.error` was called when emission rejects (FR-10).

## 3. Cross-Phase Edge Cases & Dependencies

- **Phase 1 → Phase 6**: rebuilding `packages/db` is a precondition for `phase-6-acceptance.test.ts` (FR-14). Stale `dist/` was the prior root cause; Phase 6 verification must run `turbo build` first.
- **FR-5 race**: session cap must count `expiresAt > now`. Edge case: clock skew between insert and count — assert with a fake `Date.now()` clamp.
- **FR-6 type-break**: removing `token` from `Session` is a non-additive signature change. Graph shows `createSession`/`validateSession` callers are not captured (tRPC indirection), so grep is required in addition to compile errors. Treat any `session.token` reference in `apps/**` as a Phase 2 blocker.
- **FR-9 vs FR-10**: silent `.catch()` removal can flip previously-passing tests to Red if they relied on swallowed errors. Audit `session.test.ts` and `login.test.ts` first.
- **FR-14 mock ordering**: `vi.mock("@reading-advantage/db", ...)` must be hoisted *before* import; webhook test currently fails because the mock factory references an unbuilt subpath export. Either build first or pin the mock to the `./seed` subpath.
- **Phase 5 `.gitignore`**: changing ignores can re-introduce previously-committed generated artifacts; verify `git ls-files packages/db/scripts/` is empty before adding the ignore.

## 4. Architecture Guardrails

- **No source-regex tests.** Behavior tests must `import` the unit under test or spawn it. (`env-guards.test.ts` is the reference pattern.)
- **No imports of compiled `.js` from `__tests__/`.** Vitest reads `.ts` directly.
- **`assertCan` / `requireRole` boundaries.** Authorization belongs in `permissions.ts` or in the route handler entry — never duplicated inside data-layer helpers (FR-11).
- **Adapter rule.** No new direct provider SDK imports in domain/api layers; FR-17 keeps the seed barrel split.
- **Tenant scoping.** FR-11 mandates `schoolId` scoping for TEACHER actors. Any new test that queries `users` for cross-school IDs must assert the 404/403 contract.
- **JSDoc on every export touched.** `AGENTS.md` requirement; reviewer will run `build-graph inspect` and flag missing summaries.
- **Generated artifacts.** `packages/db/scripts/*.js` and `*.d.ts*` must not be committed (FR-3/FR-4).

## 5. Per-Phase Test Approach Notes

- **Phase 1** — already Green except live-PG tests; treat as a regression gate, do not modify. Live-PG tests stay opt-in (`PG_TEST_URL` env required); they are NOT included in CI `turbo run test`.
- **Phase 2** — for each FR (8–17), add or amend exactly one targeted unit test, then run the package `check-types`. Avoid global re-runs until all subtasks land. The duplicate Task 11–17 entries at plan.md L117–L153 are pre-existing duplicates of L83–L115 (already [x]); confirm with reviewer whether to delete or mark [x] — they are NOT a second pass.
- **Phase 3** — `phase-6-acceptance.test.ts` is **live behavior** (requires real db build); `phase-7-closeout.test.ts` is **artifact/doc contract** (asserts file content, SHAs, line caps). The two must not be conflated. Phase-7 SHA hardcoding is acceptable for an archived track (Task 20 [x]) and was already accepted.
- **Phase 4** — Task 23 is a production probe and stays [~] until a deploy window. Document in `tech-debt.md`; do NOT block the track on it.
- **Phase 5** — pure repo hygiene; covered by `git status --porcelain` assertion and `.gitignore` content contract, no behavior tests.
- **Phase 6** — full-package gates; pre-existing failures (db dist tests, auth integration/closeout) are documented in `lessons-learned.md` and are NOT new regressions.

## 6. Build-Graph Findings That Shaped This Strategy

- **Graph freshness**: `graph.db` last scanned 2026-06-21 22:52 (≈4h old); 2,553 nodes / 3,510 edges / 401 files. Acceptable for this strategy.
- **`createSession` is ambiguous** — two definitions: `packages/auth/src/session.ts` and `apps/science-advantage/lib/auth/session.ts`. FR-5/FR-6/FR-8 changes target the `packages/auth` symbol only; the science-advantage copy is an independent Firebase-era duplicate and out of scope. Reviewer must `inspect` both before signing off.
- **No graph callers** for `createSession`, `validateSession`, `deleteSession`, `handleResetPassword`, `handleRegister`. Indirection through tRPC routers + Next.js route handlers is not captured by the current graph. Implication: **caller-impact analysis must combine `build-graph callers` with `rg`** for these symbols; do not rely on the graph alone.
- **`sentinelProbes` lives in TWO files** (`scripts/sentinels.ts` AND `src/sentinels.ts`). FR-3 mandates the import path; the strategy demands a single source-of-truth assertion in `journal-integrity.test.ts`.
- **`PORTFOLIO_PROJECTS`** not found via `search` — already off the root barrel per Phase 1 Task 6 / Phase 4 Task 22. A grep contract test in Phase 5 prevents regression.
- **Top imported files** (`trpc.ts`, `db-contract.ts`, `errors.ts`, `roles.ts`) bound the blast radius of changes. None of FR-5..FR-19 touch these directly; signature changes here would escalate the strategy.

## 7. Live-Proof Plan (Targeted Red → Green/Closeout Gate)

| Phase | Targeted Red command (proves intent) | Green / closeout gate (proves live behavior) | Type |
|-------|--------------------------------------|----------------------------------------------|------|
| 1 | `pnpm --filter @reading-advantage/db vitest run src/__tests__/journal-integrity.test.ts src/__tests__/env-guards.test.ts src/__tests__/barrel-hygiene.test.ts src/__tests__/package-esm-smoke.test.ts` | `CI=true pnpm --filter @reading-advantage/db test` (excluding `stale-ledger`/`ledger-doctor` unless `PG_TEST_URL` set) | live behavior |
| 1 (live-PG, opt-in) | `PG_TEST_URL=… pnpm --filter @reading-advantage/db vitest run src/__tests__/stale-ledger.test.ts src/__tests__/ledger-doctor.test.ts` | same — bounded to two files; cannot fall through into the full suite | live behavior |
| 2 | `pnpm --filter @reading-advantage/auth vitest run src/__tests__/session.test.ts src/__tests__/password.test.ts` + `pnpm --filter @reading-advantage/api vitest run src/__tests__/reset-password.test.ts src/__tests__/auth-router.test.ts` | `pnpm --filter @reading-advantage/auth check-types && pnpm --filter @reading-advantage/api check-types` | live behavior |
| 2 (cleanup) | `pnpm --filter @reading-advantage/api vitest run src/__tests__/auth-security-phase3-stub-cleanup.test.ts` (asserts deletion intent) → file removal commit | grep `it.skip` in `packages/api/src/__tests__` returns empty | artifact contract |
| 3 | `pnpm turbo run build --filter=@reading-advantage/db && cd packages/webhooks && npx vitest run src/__tests__/phase-6-acceptance.test.ts` | `CI=true pnpm --filter @reading-advantage/webhooks test` (78/78) | live behavior |
| 3 | `pnpm --filter @reading-advantage/webhooks vitest run src/__tests__/phase-7-closeout.test.ts` | same — bounded to the single closeout file | **artifact/doc contract** (not live behavior) |
| 4 | `pnpm --filter @reading-advantage/domain vitest run src/codecamp/__tests__/progress.test.ts` (or equivalent) | `pnpm --filter @reading-advantage/domain check-types` | live behavior |
| 4 (prod probe) | `pnpm --filter codecamp-advantage vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts` | runbook-driven, deferred per Task 23 | live behavior (out-of-cycle) |
| 5 | `git status --porcelain` empty + `git stash list` empty (or documented) | `rg PORTFOLIO_PROJECTS packages/domain` returns only `db/seed` paths | **artifact contract** |
| 6 | `CI=true pnpm turbo run test --filter=@reading-advantage/{db,auth,api,webhooks,domain}` | same command + `pnpm turbo run check-types --filter=…` + `pnpm turbo run build --filter=…` | live behavior |

**Fake harnesses.** None are introduced by this remediation. The existing subprocess harness in `env-guards.test.ts` spawns a real Node process and imports the real built `client.js`/`privileged.js` — it is a **bounded live smoke**, not a fake.

**Intentionally-red files discovered by aggregate suites.** `src/__tests__/stale-ledger.test.ts` and `src/__tests__/ledger-doctor.test.ts` will fail without `PG_TEST_URL` and are still owned by Phase 1 [ ] subtasks (plan.md L51–L52). They are **excluded** because the targeted `turbo` gate filters them out via vitest's `PG_TEST_URL`-gated `describe.skipIf` (already in place); the live-PG variant is the only command that runs them, and it is bounded to those two files. If a future change broadens the aggregate command, these tests must be re-gated before merge.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: post_24h_audit_remediation_20260612
phase: track setup
commits: none
tests_run: build-graph stats ./graph.db (informational, pass); no test suites executed (strategy-only role)
files_changed: measure/tracks/post_24h_audit_remediation_20260612/test-strategy.md (new)
plan_updates: none (plan.md left untouched per role contract)
known_failures: plan.md L51–L52 stale-ledger/ledger-doctor remain [ ] pending PG_TEST_URL; plan.md L117–L153 contains apparent duplicate Tasks 11–17 already satisfied by L83–L115 — recommend reviewer collapse or mark [x]; Task 23 (warm-dashboard prod probe) remains [~] pending deploy window
handoff: Reviewer/implementer should (1) confirm whether plan.md L117–L153 duplicates are bookkeeping noise vs a missed second pass, (2) honor the artifact-vs-live-behavior split in Phase 3 (phase-7-closeout is doc contract), (3) keep live-PG tests bounded to the two named files — do NOT broaden the aggregate command, (4) re-run `build-graph update ./graph.db <files>` after any signature change to `Session`, `createSession`, `deleteSession`, `handleResetPassword`, `handleRegister`, since the graph currently has zero captured callers for these (tRPC/Next route indirection) and will need rg fallback for caller analysis.
END_MEASURE_AGENT_RESULT
