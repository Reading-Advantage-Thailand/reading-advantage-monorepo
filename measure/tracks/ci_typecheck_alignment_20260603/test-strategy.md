# Test Strategy: CI Alignment + tsc Blocker Resolution

> Resolves `next.config.ts:25` `ignoreBuildErrors: true` (currently masks **617 tsc errors**, not the 360 quoted in `spec.md` — the count has roughly doubled since the 2026-05-03 `auth_strategy_review` baseline). Re-validates against the as-of-2026-06-06 codebase and revises the original 6-bucket decomposition. Several FRs in `spec.md` are already partially satisfied; this strategy splits the plan into **already-done**, **redo-with-correct-root-cause**, and **net-new** buckets so the implementer doesn't waste effort.

## 0. Current State Snapshot (verified 2026-06-06)

Before reading the per-phase table below, the implementer must internalise these baselines — `spec.md` was written against a stale codebase:

- `apps/science-advantage/vitest.unit.setup.ts:7` **already** contains `import '@testing-library/jest-dom/vitest';` (FR-1 partial).
- `apps/science-advantage/package.json` **already** has `@testing-library/jest-dom@^6.9.1` in devDependencies (FR-1 partial).
- `apps/science-advantage/package.json:14` **already** has `"check-types": "tsc --noEmit"` (FR-7 done).
- `apps/science-advantage/.github/workflows/ci.yml` **still exists** (FR-9 pending) — drifted as documented (uses `npm ci` against non-existent `package-lock.json`, references `NEXTAUTH_*` env vars).
- Root `.github/workflows/ci.yml` **runs** `pnpm build`, `pnpm lint`, `pnpm test` on `pull_request` to `main`, **but**: (a) no `check-types` step exists; (b) no `paths:` filter exists (all PRs run the full pipeline); (c) the `science-advantage` package is not explicitly filtered. FR-10 needs both a `paths:` block **and** a `check-types` job step.
- `tsc --noEmit` from `apps/science-advantage/` exits with **617** errors (TS2339=347, TS2769=225, TS2741=12, TS2345=9, TS2322=7, TS2305=5, others=12). 287 of the TS2339 errors are testing-library matcher narrowing (`toBeInTheDocument`/`toHaveTextContent`/`toHaveClass`/etc.).

**Root-cause re-diagnosis** (FR-1, the big one): the jest-dom import is correct but *ineffective* because the monorepo currently resolves **three distinct vitest versions** (3.2.4, 4.1.5, 4.1.6 — verified via `find node_modules/.pnpm -name vitest`). The `declare module 'vitest'` augmentation in `@testing-library/jest-dom/types/vitest.d.ts` only patches **one** vitest's `Assertion<T>` interface; tests in `apps/science-advantage` resolve `expect` / `Assertion` from the version pulled in transitively by `next@16` (or another package), which never sees the patch. Adding the import does nothing until the version split is collapsed.

## 1. Testing Pyramid Per Phase

| Phase (from `plan.md`)                                            | Verification approach                                                                                                        | Gate (must exit 0)                                                                                                                  |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **P0 baseline**                                                   | Re-run `tsc --noEmit` and capture the 617-error breakdown by error code into the commit message (proof-of-baseline).         | none (baseline only)                                                                                                                |
| **P1 jest-dom types**                                             | After dedupe + correct setup wiring, `tsc --noEmit` drops by ≥287 (the TS2339 matcher cohort).                               | `pnpm --filter science-advantage check-types 2>&1 \| grep -c "toBeInTheDocument\|toHaveTextContent" == 0`                          |
| **P2 INTERN role widening**                                       | Pure-type fix in `packages/auth/src/roles.ts` (the canonical `UserRole` source — `lib/auth/session.ts` is consumer only).    | `pnpm --filter @reading-advantage/auth check-types` exits 0; `pnpm --filter science-advantage check-types 2>&1 \| grep -c "INTERN" == 0` |
| **P3 missing `lib/auth/{password,rate-limit}.test.ts` siblings** | Choose **(b) tsconfig exclude** over (a) stubs — Track 3 (Argon2id) is in flight and will replace these any week now; an empty stub creates merge friction. Document the exclude with a `// TODO(track:argon2id_password_20260603)` comment in `tsconfig.json` (jsonc not supported there — use `// @ts-expect-error` adjacent to the consumer instead, or just a comment in `spec.md`). | `tsc` no longer reports `Cannot find module './password'`.                                                                          |
| **P4 ProcessEnv narrowing (3 errors)**                            | All 3 sites import the schema-validated `env` from a shared location. **Blocker:** `apps/science-advantage/lib/env.ts` does not yet exist (Track 7 prerequisite). Interim fix: cast to `Record<string, string \| undefined>` and add a tech-debt row pointing at Track 7. | `tsc` reports 0 TS2559 in those 3 files.                                                                                            |
| **P5 next@16 dedupe (4 errors)**                                  | Use the **vitest dedupe** (not next@16) as the *primary* dedupe — see §3 cross-phase note. The original spec misidentified the duplicate. Run `pnpm why vitest` to identify the dependents pulling the older versions; pin via `pnpm.overrides`. | `pnpm dedupe --check` exits 0 for vitest **and** next. `tsc` 0 errors on `RequestInit` / `CurriculumUnitSummary`.                  |
| **P6 misc (4 errors)**                                            | Each is local & isolated; verify per-file. See §6 for the current file:line of each.                                          | `tsc` reports 0 errors in the named files.                                                                                          |
| **P7 add `check-types` script**                                   | Already done; verify with `pnpm --filter science-advantage check-types`. Update plan task to `[x]`.                          | `pnpm turbo run check-types --filter=science-advantage` resolves to the script (not a no-op).                                       |
| **P8 remove `ignoreBuildErrors`**                                 | Only flip `ignoreBuildErrors: true → false` **after** P1–P6 confirmed 0 errors. Update the 24-line comment block to a one-liner (or remove). | `pnpm turbo run build --filter=science-advantage` exits 0.                                                                         |
| **P9 delete app-local `ci.yml`**                                  | `git rm apps/science-advantage/.github/workflows/ci.yml`. If `.github/` becomes empty, remove it too.                          | `find apps -path '*/.github/workflows/*.yml'` returns empty.                                                                        |
| **P10 root CI gating**                                            | Two edits to `.github/workflows/ci.yml`: (i) add `paths:` filter (incl. `apps/science-advantage/**` + shared paths); (ii) add `- name: Type check\n        run: pnpm turbo run check-types` step **after** Lint, **before** Build. Verify on a draft PR. | Draft PR shows `Type check` job running and passing.                                                                                |
| **P11 react-hooks/immutability (4 errors)**                       | Read `components/features/teacher/analytics/student-lesson-detail-analytics.tsx:151,155,186`; lift `fetchAnalytics` declaration via `useCallback` (prefer over hoisting — preserves dependency tracking). Verify no stale-closure regression by checking the analytics endpoint refetches when `studentId`/`lessonId` change. | `pnpm --filter science-advantage lint` exits 0.                                                                                     |
| **P12 unused-var warnings (6)**                                   | In `lib/gamification/badges.ts:114,202`, **prefer removing the parameter** over `eslint-disable`. The shared ESLint config in `packages/config` already grants the `_` prefix an escape hatch — if it's still warning, the rule is set to `argsIgnorePattern: "^$"` not `"^_"`. Fix the lint rule (1 line in `packages/config/src/eslint.base.ts`) instead of touching 6 lines of code. **Lower blast radius.** | `pnpm --filter science-advantage lint` 0 warnings.                                                                                  |
| **P13 final acceptance**                                          | Run all 4 gates filtered to `science-advantage` plus the workspaces this track touched (`@reading-advantage/auth`, `@reading-advantage/config`). | All 4 turbo gates exit 0.                                                                                                            |
| **P14 closeout**                                                  | `tech-debt.md` row updates per `plan.md`; lessons-learned entry on the vitest-version-split root cause (much more interesting than the spec's "ignoreBuildErrors is bad" framing). | `measure/tracks.md` updated; track moved to `archive/`.                                                                              |

## 2. Shared Fixtures / Mocks

This is a tsc-only track — **no new test fixtures are required**. The only mock-adjacent work is in P1 (jest-dom type wiring), which is a build-time concern. The integration-test seed pattern (`app/api/lessons/[lessonSlug]/route.integration.test.ts`) and the `createMockDb` helper (`packages/domain/src/__tests__/mock-db.ts`) are untouched.

If P1's dedupe forces a `pnpm.overrides` for vitest, the implementer must run the **existing** test suites end-to-end before declaring P1 done — version pinning can break test helpers that depend on vitest internals (e.g. `vi.mocked`, fake-timer behaviour). Specifically rerun:

- `pnpm turbo run test --filter=@reading-advantage/auth` (current: 263 passing per the 2026-06-05 Phase 6 closeout note).
- `pnpm turbo run test --filter=@reading-advantage/domain`.
- `pnpm --filter science-advantage exec vitest run --config vitest.unit.config.ts`.
- `pnpm --filter science-advantage test:integration` (slowest; needs `science_advantage_test` DB up).

## 3. Cross-Phase Edge Cases & Dependencies

- **Vitest version split is the hidden root cause of FR-1 (P1).** `spec.md` and `plan.md` both attribute ~354 errors to "missing jest-dom import"; the import is already there. The fix is the dedupe in P5. Sequence P5 *before* P1 — once vitest is single-version, the existing import becomes effective and the 287 matcher errors evaporate without any further code change. **Reordering P1↔P5 in `plan.md` is the single most important change this strategy recommends.**
- **Stale `spec.md` error counts.** `spec.md` says 360 errors, decomposed as 354+2+2+3+4+4 = 369. Today's count is 617 — the gap (≈250 errors) is mostly TS2769 overload errors (225 of them) that were not in the original audit, likely introduced by next@16 type changes during the upgrade. **Pre-commit task for the implementer**: dump the *current* per-file error histogram into the commit message of P0 so we know what we actually fixed.
- **P2 (INTERN role) lives in `packages/auth/src/roles.ts`, not `lib/auth/session.ts`.** Verified: `lib/auth/session.ts` is a consumer that imports `UserRole` from `@reading-advantage/auth`. Adding `'INTERN'` to the union in `packages/auth/src/roles.ts` is a 1-line change with caller blast-radius = every consumer of `UserRole` (run `build-graph callers UserRole` before touching it; only widening the union is non-breaking).
- **P3 / P4 cross-track coupling.** P3's `lib/auth/{password,rate-limit}.test.ts` siblings are created by Track 3 (Argon2id) and Track 10 (Rate Limiter v2). P4's `lib/env.ts` is created by Track 7. If any of those tracks ship between this track's plan-write and implementation, the implementer must re-probe before doing the "interim" fix — it may already be unnecessary.
- **P10 (`paths:` filter) interacts with concurrency.** The root workflow has `concurrency: group: ci-${{ github.ref }}, cancel-in-progress: true`. Adding `paths:` filters means PRs that touch only docs/`measure/**` skip CI entirely. **Risk:** a PR that touches `measure/tracks/<track>/plan.md` without `apps/**` won't run gates — usually fine, but a tech-debt entry should call this out so contributors don't think CI is broken.
- **P11 `useCallback` choice.** `fetchAnalytics` is referenced in 3 places (lines 151, 155, 186); the most idiomatic React fix is `useCallback` with `[studentId, lessonId]` deps and a `useEffect` that triggers on mount + dep change. Hoisting as a plain `function` would re-create the function each render and re-trigger the `useEffect` infinitely — **do not hoist without `useCallback`**.
- **P12 lint-rule fix vs. code fix.** Fixing the lint config (`argsIgnorePattern`) in `packages/config` propagates the relaxation to *every* package, not just science-advantage. This is correct — the codebase clearly intends `_`-prefix to mean "intentionally unused" already. But it changes lint output for reading-advantage, primary-advantage, etc. **Mitigation**: run `pnpm turbo run lint` (no filter) before committing P12 to confirm no other app starts passing warnings it was previously hiding.

## 4. Architecture Guardrails

- **No new `// @ts-expect-error` or `// @ts-ignore` comments** unless documented with a `TODO(track:<id>)` and added to `tech-debt.md`. The whole point of this track is to *remove* type-safety holes, not relocate them.
- **No new `ignoreBuildErrors`** anywhere in `apps/**` or `packages/**`. Add a `doctor` rule (or grep guard in CI) that fails if any `next.config.{ts,js,mjs}` contains `ignoreBuildErrors: true` after this track lands.
- **`paths:` filter must include `packages/**`, `.github/workflows/**`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, and `package.json`.** Any change to those affects every app; skipping CI for them would be unsafe.
- **`pnpm.overrides` (if used in P5) belongs in the *workspace root* `package.json`, not in `apps/science-advantage/package.json`.** Per-app overrides are silently ignored by pnpm in a workspace.
- **The `check-types` turbo task in `turbo.json` must declare `dependsOn: ["^check-types"]`** so the science-advantage typecheck doesn't run before its workspace deps (auth, domain, db, api) typecheck. Verify before P10.
- **No edits to `lib/auth/session.ts`** in this track — Track 3 (Argon2id) deletes it. The INTERN fix lands in `packages/auth/src/roles.ts` only.

## 5. Per-Phase Test Approach Notes

- **P0:** `cd apps/science-advantage && npx tsc --noEmit 2>&1 | grep "error TS" | grep -oP "TS\d+" | sort | uniq -c | sort -rn > /tmp/tsc-baseline.txt`. Copy into the P0 commit message. This is the bar against which subsequent phases measure.
- **P1 (after P5):** Just rerun `tsc --noEmit | grep -c "toBeInTheDocument\|toHaveTextContent\|toHaveClass\|toBeVisible\|toBeDisabled"` — expect a drop of ≥287. If it doesn't drop, the dedupe in P5 was incomplete; do **not** add workarounds — fix the dedupe.
- **P2:** `pnpm --filter @reading-advantage/auth check-types` to catch any internal-to-auth fallout from widening `UserRole`. Then `pnpm --filter science-advantage check-types | grep INTERN` → 0.
- **P3:** add `lib/auth/password.test.ts` and `lib/auth/rate-limit.test.ts` to `tsconfig.json` `exclude` with the existing exclude pattern; or, simpler, exclude them via a glob (`lib/auth/*.test.ts`) if no other auth test files exist in that dir (verify first — `ls apps/science-advantage/lib/auth/*.test.ts` should be empty *or* return only the two missing files).
- **P4:** the interim cast pattern: `const env = process.env as Record<string, string | undefined>; const url = resolveTestDatabaseUrl(env);`. Add a tech-debt row pointing at Track 7 (env-schema migration).
- **P5:** `pnpm why vitest` from the monorepo root identifies which dependents pull which versions. Likely culprits: `@vitest/coverage-v8@4.x` and `@vitest/ui@3.x` against `vitest@3.x`. Pin via `"pnpm": { "overrides": { "vitest": "3.2.4" } }` in root `package.json`. Verify `pnpm install --frozen-lockfile` still resolves; verify no `apps/**` test suite regresses.
- **P6 misc errors:** per current grep of `tsc` output:
  - `user-menu string|null` → check `components/features/auth/user-menu.tsx` for `name: string | null` passed to a `string`-only sink.
  - `beforeEach import` → likely a `vitest` re-export missing in a `*.test.ts` file; fix by adding `import { beforeEach } from 'vitest';`.
  - `xp.test comparison` → `lib/gamification/xp.test.ts:124` — likely a `number | undefined` compared with `>`; add a non-null assert or guard.
  - `mastery-profile overload` → look for `mastery-profile` in the tsc output to identify the file; likely a fn-call with stale argument shape post next@16.
- **P7:** the `check-types` script already exists; this phase becomes a verification (`pnpm turbo run check-types --filter=science-advantage` exits 0 *and* logs at least one tsc invocation, not a skip).
- **P8:** the diff is 1 character (`true → false`) plus comment cleanup. Build must pass *before* the flip is committed (sequence the commits: typecheck-clean first, then flip, then build).
- **P9:** `git rm apps/science-advantage/.github/workflows/ci.yml`. Also `rmdir apps/science-advantage/.github/workflows && rmdir apps/science-advantage/.github` if empty.
- **P10:** patch `.github/workflows/ci.yml`. Sample fragment:
  ```yaml
  on:
    pull_request:
      branches: [main]
      paths:
        - 'apps/**'
        - 'packages/**'
        - 'services/**'
        - '.github/workflows/**'
        - 'package.json'
        - 'pnpm-lock.yaml'
        - 'pnpm-workspace.yaml'
        - 'turbo.json'
  ```
  And add a step after `Lint`:
  ```yaml
        - name: Type check
          run: pnpm turbo run check-types
  ```
- **P11:** wrap `fetchAnalytics` in `useCallback(async () => { ... }, [studentId, lessonId])` and reference it from the `useEffect` deps array.
- **P12:** edit `packages/config/src/eslint.base.ts` (or wherever `@typescript-eslint/no-unused-vars` is configured) to add `argsIgnorePattern: "^_"`. Or, if already present, escalate `varsIgnorePattern` likewise. Run `pnpm turbo run lint` (unfiltered) to confirm no warning regressions.
- **P13:** all 4 gates green, on the merge target branch tip.
- **P14:** the lessons-learned entry should read something like: *"Multiple vitest versions in a pnpm workspace silently break `declare module 'vitest'` type augmentations from sibling packages (e.g. `@testing-library/jest-dom/vitest`). Symptom: matcher narrowing fails at type-check time despite a correct `setupFiles` import. Fix: `pnpm.overrides` to pin one vitest. Detection: `pnpm why vitest` lists multiple resolutions."* This is reusable across the monorepo and across the next.js / vitest upgrades that are coming.

## 6. build-graph Findings That Shaped Strategy

Graph stats (verified today): 1665 nodes / 2408 edges / 215 files, fresh (mtime 2026-06-06). Relevant probes (`build-graph stats ./graph.db` and `build-graph search ./graph.db <keyword>`):

- `search UserRole` → `packages/auth/src/roles.ts` is the canonical source (6 imports). The `lib/auth/session.ts` consumer in science-advantage shows 0 incoming `param_flow` edges in the graph because it's in an app, not a package — but reading the file confirms it `import { type UserRole } from '@reading-advantage/auth/roles'`. **Implication for P2:** widen the union in `roles.ts` only; do not edit `lib/auth/session.ts`.
- `search auditEvents` / `search recordAuditEvent` — no direct relevance, but confirms the `audit_log_retention_dsar_20260605` track's exports are stable; nothing in this track touches the audit subsystem.
- `search vitest` returns 0 matches because `.test.ts` files are filtered out of the scan (per `agents-md-audit-protocol.md` §3.6). The vitest-version-split diagnosis was made via filesystem probes (`find node_modules/.pnpm -name vitest`), not graph queries.
- **Top imported file is `db-contract.ts` (19 imports), then `users.ts` (12), `trpc.ts` (12), `codecamp-curriculum-data.ts` (9).** None of these are touched by this track — confirms low blast radius for everything except P12 (lint rule change in `packages/config`, which affects every app).
- **Blast-radius summary:** P2 (UserRole union widening) and P5 (vitest pin) are the only changes with workspace-wide reach. Both are *additive* (widening a union, pinning a version that satisfies all current peer-ranges). Graph caller-check in `review` should be **Pass** by construction. Run `build-graph update ./graph.db packages/auth/src/roles.ts` after the P2 commit; no other updates needed (workflow yml, next.config.ts, tsconfig.json, package.json, badges.ts, eslint.base.ts are not in the graph's scan scope).

## 7. Sequenced Implementation Order (final recommendation)

**Important — this differs from `plan.md`'s phase ordering.** The implementer should execute in this sequence:

1. P0 baseline (capture 617-error histogram).
2. **P5 first** (vitest dedupe via `pnpm.overrides`) — unblocks P1.
3. P1 verify (expect ~287 matcher errors to vanish; no code change).
4. P2 INTERN union widening in `packages/auth/src/roles.ts`.
5. P3 tsconfig exclude for missing auth siblings.
6. P4 ProcessEnv interim cast (or wait for Track 7 if it ships first).
7. P6 misc fixes (4 errors).
8. P7 verify (already done).
9. **Run full `tsc --noEmit` — must be 0 errors before P8.**
10. P8 flip `ignoreBuildErrors: false`.
11. P11 useCallback fix in student-lesson-detail-analytics.
12. P12 lint-rule fix in `packages/config`.
13. P9 delete app-local ci.yml.
14. P10 update root ci.yml (paths filter + check-types step).
15. P13 final gates.
16. P14 closeout + lessons-learned.

The vitest dedupe is the keystone. Everything else is small.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: ci_typecheck_alignment_20260603
phase: track setup
commits: none
tests_run: none (strategy only; tsc --noEmit run for baseline diagnosis: 617 errors current, vs 360 quoted in spec.md)
files_changed: measure/tracks/ci_typecheck_alignment_20260603/test-strategy.md (new)
plan_updates: none (plan.md untouched; strategy recommends phase reorder in §7 — implementer should follow §7 sequence, not plan.md sequence)
known_failures: none (strategy phase; no code changes)
handoff: Implementer must (1) execute P5 (vitest dedupe via pnpm.overrides) before P1 — the jest-dom import is already in place and ineffective due to the multi-version vitest split (3.2.4, 4.1.5, 4.1.6) — see §0 and §3; (2) capture the per-error-code baseline histogram in the P0 commit message (617 errors today, not 360 — spec.md is stale); (3) widen UserRole in packages/auth/src/roles.ts, not lib/auth/session.ts (Track 3 deletes that file); (4) prefer the 1-line lint-rule fix in packages/config over per-call eslint-disable comments for P12 — verify with unfiltered `pnpm turbo run lint`; (5) use useCallback (not function hoisting) in P11 to avoid stale-closure / infinite-effect-loop regressions; (6) interim ProcessEnv cast for P4 if Track 7 (env schema) has not shipped yet — file a tech-debt row pointing at the cleanup; (7) run `build-graph update ./graph.db packages/auth/src/roles.ts` after P2 commit; no other graph updates required.
END_MEASURE_AGENT_RESULT
