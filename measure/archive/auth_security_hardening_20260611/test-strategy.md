# Test Strategy: Auth Security Hardening

## 1. Testing Pyramid Per Phase

- **Phase 1 (Contract & Schema):** types-as-tests + 1 migration-journal sanity test. No behavioural tests yet; rely on `pnpm --filter @reading-advantage/db check-types` and `drizzle-kit status` exiting clean. Stubs must throw `"not implemented"` so Phase 2 reds are unambiguous.
- **Phase 2 (Red):** 100% unit tests with mocked DB. No integration, no E2E. Every FR gets exactly one failing assertion path — keep tests narrow so Green deltas are reviewable.
- **Phase 3 (Green):** unit-test churn only; the Phase 2 suite is the spec. Add `recordAuditEvent` spies (not real inserts) — audit DB integration is owned by `audit_log_infrastructure_20260603`, do not re-cover it here.
- **Phase 4 (Docs & Doctor):** type-check + build are the integration gate. No new E2E. Manual smoke: login → reset-password → confirm old cookie 401s.

## 2. Shared Fixtures & Mocks

- **Mock DB:** reuse `packages/domain/src/__tests__/mock-db.ts` pattern (`vi.fn()` chainable). Do **not** stand up real Postgres in this track.
- **`createMockSessionRow(overrides)`** — colocated in `packages/auth/src/__tests__/fixtures.ts` (new). Used by FR-1/8/10 tests.
- **`DUMMY_HASH` fixture** — export a single Argon2id hash constant from a test fixture so FR-4 timing-spy tests and login.ts share one value.
- **Request builder** — `packages/api/src/__tests__/_helpers/buildRequest.ts` (new): produces a `Request` with `cookies`, `x-forwarded-for`, `user-agent` headers. Reused by FR-6, FR-8, FR-11, FR-9 specs.
- **`recordAuditEvent` spy** — single `vi.mock("../../audit")` setup imported by `auth-routes.test.ts`, `auth-audit.test.ts`, `reset-password.test.ts`. Avoid per-test re-mocking drift.
- **`enrichAuthUser` mock** — once FR-12 lands, both `handleSession` and `handleLogin` tests must share the same fixture user shape; expose it from `packages/api/src/__tests__/_helpers/authUser.ts`.

## 3. Cross-Phase Edge Cases & Dependencies

- **FR-1 ↔ FR-7a/FR-10:** all three touch `sessions` row identity. Ordering matters — implement FR-1 (Task 17) before FR-10 (Task 27) so the cap-eviction query targets `tokenHash`-keyed rows, not raw `token`.
- **FR-6 ↔ FR-16:** gating register (Task 22) without removing the auth-client `register()` (Task 42) breaks reading-advantage signup at runtime. Tests for Task 14 (FR-6) and Task 38 (FR-16) must both be red before any Green work begins, and Task 22 + Task 42 + Task 43 must land in the same commit or contiguous PR window.
- **FR-4 dummy hash:** verify `verifyPassword` is **awaited** in the not-found branch. A spy that ignores `await` will pass a buggy synchronous return — assert via `expect(verifyPassword).toHaveBeenCalledWith(input, DUMMY_HASH)` *and* `await`-based timing (no real Argon2 in CI — mock it).
- **FR-5 vs FR-9:** the DB-error branch must NOT emit `auth:login_failed` (it's infrastructure, not a credential failure). Add an explicit negative assertion in `auth-audit.test.ts`.
- **FR-7b authorization matrix:** the 7-row matrix in Task 15 is the contract. Use `test.each` to keep it readable and prevent partial coverage.
- **FR-12 ↔ FR-13/14/15:** the auth-client hook tests (`hooks.test.tsx`) mock `/api/auth/session` and `/api/auth/login`. Update the shared response fixture once for FR-12, then layer race/logout/derivation tests on top — do not maintain three divergent shapes.
- **Migration 0018 backfill:** Task 1's journal repair must run *before* Task 2's 0019 migration; otherwise `drizzle-kit` will renumber and break Task 17's column reference.

## 4. Architecture Guardrails

- **No transport coupling:** `revokeAllUserSessions`, `enrichAuthUser`, and `sha256Hex` live in `packages/auth` / `packages/api` and must be invocable from a worker or CLI without a `Request`. Tests must instantiate them directly, never through Next.js handlers.
- **No real provider SDKs in tests:** mock Argon2 (`@node-rs/argon2`) at the module boundary, not via timing tricks. Real Argon2 in CI inflates test time and creates flakes.
- **Tenant scoping:** `handleResetPassword` queries the target user across schools (admin path). When using `TenantDB`, the admin path must use `.unscoped("admin password reset crosses tenants")` with the exact reason string — assert this in code review, not via test, but call it out in the FR-7b PR description.
- **No business logic in route handlers:** the actual reset-password authorization belongs in a `permissions.ts` predicate (`canResetPassword(actor, target)`); the route handler orchestrates. Add a dedicated `permissions.test.ts` block for this predicate so the matrix is testable without HTTP plumbing.
- **`"use client"` preservation:** Task 44 must assert `dist/index.js` begins with `"use client"` after the FR-15 dependency reshuffle. Add this as a build-time test, not a manual check.

## 5. Per-Phase Test Approach Notes

- **Phase 1:** stubs throw; one migration-journal assertion (`_journal.json` has idx 18 + 19). No vitest run expected to pass beyond compile.
- **Phase 2:** Tasks 9–16 + 35–38 must produce a fully red suite. Run `pnpm --filter @reading-advantage/auth test --reporter=verbose` and confirm each named test is listed as failing — not skipped, not erroring on import.
- **Phase 3:** Green strictly tracks the Phase 2 list. After each Task NN, run only the file under test (`vitest run path/to/file`) to keep the loop tight; full-suite run is reserved for Task 29.
- **Phase 4:** Tasks 29–31 + 44 are the gates. `CI=true` is mandatory (some tests gate on it). Type-check the four consumer apps in Task 44 to catch any stale `register()` import the grep missed.

## 6. build-graph Findings That Shaped This Strategy

- `graph.db` is fresh (Jun 11, post-track-creation). `build-graph stats` shows 2006 nodes / 267 files across 10 packages.
- `build-graph files ./graph.db packages/auth/src` confirms `session.test.ts`, `tenant.test.ts`, `password.test.ts` already exist — Phase 2 **extends** them, does not replace. Avoid `describe.only`-style accidents.
- `build-graph files ./graph.db packages/api/src/routes/auth` shows `index.ts`, `login.ts`, `register.ts`, `logout.ts`, `session.ts`, `impersonate.ts` — but **no** `reset-password.ts` and **no** `enrich.ts`. Both are Phase 1 contract additions and must be exported from `index.ts` (Task 7).
- `build-graph files ./graph.db packages/auth-client` shows only 4 files, one test (`hooks.test.tsx`). All FR-12/13/14/15/16 auth-client coverage lives in that single file — keep it cohesive; do not split prematurely.
- `build-graph callers` returns empty for `createSession`, `validateSession`, `assertTenantAccess`, `recordAuditEvent`: cross-package `calls` edges are not resolved in this graph. Treat caller lists as **incomplete** — supplement with `rg "createSession\("` before Task 25 and Task 39 to ensure every call site receives the new opts/enriched-response.
- Two `createSession` definitions exist (`packages/auth/src/session.ts` and `apps/science-advantage/lib/auth/session.ts`). Confirm Task 17 edits the package version only; the app-local one is legacy and must not be silently aligned in this track (file a tech-debt entry if discovered live).
- `build-graph search register` confirms only one `handleRegister`, one `registerSchema`, and the auth-client `AuthProvider` — FR-6 + FR-16 blast radius is tightly contained, making the coordinated Task 22/42/43 landing realistic.
