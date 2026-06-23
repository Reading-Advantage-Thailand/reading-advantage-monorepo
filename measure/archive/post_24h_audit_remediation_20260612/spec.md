# Specification: Post-24h Audit Remediation

## Overview

A 24-hour commit audit of the active Measure tracks surfaced implementation
quality gaps that were papered over by phase checklists and git notes. This
track closes those gaps before they become production regressions or lost work.

**Affected areas:**

1. `packages/auth` / `packages/api/src/routes/auth` — session cap, token
   handling, audit fire-and-forget, skipped stub tests, deferred manual
   verification.
2. `packages/db` — Phase-3 Green implementation currently exists only in a git
   stash; source-level regex tests instead of behavior tests; untracked
   generated artifacts.
3. `packages/webhooks` — Phase-5/6/7 closeout tests are brittle process
   bookkeeping; Phase-6 acceptance test is failing in the current environment.
4. `apps/codecamp-advantage` / `packages/domain/src/codecamp` — warm-dashboard
   optimization unverified in production; progress module still imports seed
   data through the root barrel.
5. Repository hygiene — long-lived stashes, tight crypto test timeouts,
   residual `as` casts.

This track is **high priority** because it rescues uncommitted db-ledger work
and hardens auth/session logic that is already merged but incomplete.

---

## Functional Requirements

### FR-1: Rescue and Commit the DB Migration Ledger Phase-3 WIP

**Problem:** The db-ledger Phase-3 Green implementation (journal re-stamp,
doctor body, ESM `.js` extensions, env guards, sessions indexes, barrel
hygiene) is in `stash@{0}` only. If the stash is dropped, the work is lost and
the journal remains dangerously non-monotonic.

**Change:**

- Pop `stash@{0}`.
- Separate any auth-security changes that were accidentally folded into the
  stash (e.g., `packages/api/src/__tests__/reset-password.test.ts` cast fix).
- Commit each db-ledger Phase-3 deliverable with its own commit (matches the
  existing Measure plan tasks).
- Verify the Phase-2 Red tests now pass Green.

---

### FR-2: Replace Source-Level Regex Tests With Real Behavior Tests

**Problem:** `packages/db/src/__tests__/env-guards.test.ts` does not import
`client.ts` or `privileged.ts`; it spawns a harness that only checks the source
text with regex (`/throw\s+new\s+Error…DATABASE_URL/`, `/console\.warn/`,
etc.). This proves the source *looks* correct, not that it behaves correctly.

**Change:**

- Rewrite `env-guards.test.ts` to spawn a subprocess that actually imports
  `./client.js` / `./privileged.js` under controlled `NODE_ENV`/`DATABASE_URL`/
  `DIRECT_DATABASE_URL` values.
- Assert on exit code and stderr/stdout messages.
- Keep the tests fast by importing the built module with a stub URL and a
  short connect timeout, or by mocking `postgres()` at the test boundary.

---

### FR-3: Stop Importing Compiled `sentinels.js` in Tests

**Problem:** `journal-integrity.test.ts` dynamically imports
`../../scripts/sentinels.js`, so the test depends on a generated `.js` artifact
that is currently untracked and can become stale relative to `sentinels.ts`.

**Change:** Import `sentinelProbes` directly from `../../scripts/sentinels.ts`
(Vitest supports TypeScript). Add `packages/db/scripts/*.js` and
`*.d.ts*` to `.gitignore` or delete generated files after build.

---

### FR-4: Clean Generated Artifacts and Worktree Hygiene

**Problem:** `packages/db/scripts/sentinels.{js,d.ts,d.ts.map}` and
`tsconfig.build.json` are untracked in the worktree. Generated artifacts should
never be hand-managed.

**Change:**

- Decide whether these files belong in `.gitignore` or are build outputs that
  should be deleted.
- Restore a clean `git status` before any further phase work.
- Ensure the db package `build` script cleans or ignores its emitted scripts
  artifacts consistently.

---

### FR-5: Harden the Session Cap

**Problem:** `createSession` caps sessions at 10 by counting **all** rows
(including expired) and deleting the oldest in a non-atomic count-delete-insert
sequence. Concurrent logins can exceed the cap; expired sessions consume quota.

**Change:**

- Count only **non-expired** sessions (`expiresAt > now`).
- Wrap the count, oldest-row delete, and insert in a single transaction or use
  a single `WITH` CTE where practical.
- Update the Phase-2 Red test to reflect the corrected contract.

---

### FR-6: Remove the Legacy `token` Field From the Session Return Type

**Problem:** `validateSession` returns `session.token`, but after FR-1 the
`token` column is dormant and nullable. The `Session` interface still declares
`token: string`, which is a type lie and a footgun for callers.

**Change:**

- Remove `token` from the `Session` interface in `packages/auth/src/session.ts`.
- Update callers (`server.ts`, routes, tests) so they no longer expect it.
- `createSession` can continue to return the raw token for cookie wiring via a
  separate, narrower return type if needed.

---

### FR-7: Delete Skipped Phase-1 Stub Tests

**Problem:** `packages/api/src/__tests__/auth-security-phase3-stub-cleanup.test.ts`
commits three `it.skip(...)` assertions for stubs that were superseded by
Phase-3 implementation. Skipped tests are dead weight.

**Change:** Delete the skipped assertions and, if useful, fold any remaining
value into a positive regression test that asserts the real behavior.

---

### FR-8: Clean Up `createSession` Insert Type Cast

**Problem:** `createSession` uses an elaborate conditional type cast:

```ts
insertValues as Parameters<typeof db.insert>[0] extends { values: (v: infer V) => unknown } ? V : never
```

This is a workaround for a typing problem that should be solved with
`InferInsertModel` or a properly typed values object.

**Change:** Replace the cast with a typed object derived from the schema's
insert model, or build the values object inline in the `.values()` call so the
type is inferred correctly.

---

### FR-9: Harden `deleteSession` Error Handling

**Problem:** `deleteSession` catches and silently ignores all errors, hiding
real DB/infrastructure failures.

**Change:** Narrow the catch to the expected "row does not exist" case only
(e.g., check the error code or use `returning()` and ignore zero rows), and let
unexpected errors propagate.

---

### FR-10: Harden Audit Event Emission

**Problem:** Login and reset-password audit events are fire-and-forget with
`.catch(() => {})`. Security-sensitive audit records can be lost silently.

**Change:**

- At minimum, log audit-event failures with `console.error` or a proper logger.
- Prefer awaiting audit events on the success paths where latency is acceptable
  (login, reset-password). If fire-and-forget is required for performance,
  document the trade-off and ensure failures are observable.

---

### FR-11: Harden `handleResetPassword` Authorization

**Problem:**

- The handler calls `requireAuth` then `requireRole`, causing two DB lookups.
- The target user is loaded without tenant scoping, leaking cross-school
  existence (404 vs 403) before the school check.
- The credential-account update is not verified; if no credential account
  exists it still returns 200.

**Change:**

- Use `requireRole` once and reuse its returned session.
- Scope the target-user lookup by school for TEACHER actors (ADMIN bypasses).
- Return a clear error if the target has no credential account.

---

### FR-12: Clean Up `handleRegister` Error Handling

**Problem:** `handleRegister` detects `AuthError` by checking
`error.name === "AuthError"` and then casts to extract `code`. This is brittle
and bypasses the typed `AuthError` class.

**Change:** Import `AuthError` from `@reading-advantage/auth` and use
`instanceof` + `error.code` directly.

---

### FR-13: Fix Crypto Test Flakiness

**Problem:** `packages/auth/src/__tests__/password.test.ts` tests real bcrypt →
Argon2id migration and timed out at 5000ms during the audit. Cryptographic cost
is hardware-dependent; the default timeout is too tight.

**Change:**

- Increase the test timeout for hashing/verification tests (e.g., 15000ms or
  `vi.setConfig({ testTimeout: 15000 })` in the relevant `describe`).
- Alternatively, mock `argon2`/`bcryptjs` for the unit-level migration test and
  keep a single integration test with a longer timeout.

---

### FR-14: Stabilize the `codecamp_review_ai_consolidation` Phase-6 Acceptance Test

**Problem:** `packages/webhooks/src/__tests__/phase-6-acceptance.test.ts` now
fails with `Failed to resolve entry for package "@reading-advantage/db"` when
mocking the webhook module. The closeout report claimed it passed.

**Change:**

- Diagnose whether the failure is caused by a stale/missing `packages/db`
  build, incorrect `exports` map, or a `vi.mock` ordering issue.
- Make the test deterministic: build required dependencies before running, or
  mock the db package boundary explicitly.
- Re-run the test until it passes reliably from a clean state.

---

### FR-15: Harden or Remove Brittle Closeout Bookkeeping Tests

**Problem:** `phase-7-closeout.test.ts` is 518 lines of process tests (markdown
line caps, directory moves, git notes, hardcoded commit SHAs). It is brittle,
expensive, and tests Measure bookkeeping rather than product behavior.

**Change:**

- Replace hardcoded commit SHAs with lookups from `plan.md` or environment
  variables, or derive them from `git log`.
- Remove the line-cap tests from the test suite; enforce bounded working-memory
  files via a lightweight CI lint or pre-commit hook instead.
- Keep only the behavior-relevant assertions (e.g., source files are clean of
  inline OpenRouter calls) and delete the git-state/markdown assertions.

---

### FR-16: Verify the Warm-Dashboard Optimization in Production

**Problem:** `apps/codecamp-advantage/app/[locale]/page.tsx` was refactored to
use `next/dynamic` with `ssr: false` for the dashboard content, but the actual
`GET /en/` warm latency was never re-measured from a network with production
reach. The last measured value was 1290ms against a 1000ms budget.

**Change:**

- Deploy or use an existing production-like environment.
- Run `phase-6-performance-and-latency.test.ts` with network probes enabled.
- If the budget is still violated, file a follow-up track with the next lever
  (CDN/s-maxage investigation, further bundle split, or dedicated login page).
- If the budget passes, update the track plan with evidence and close the
  warm-dashboard track.

---

### FR-17: Move `PORTFOLIO_PROJECTS` Off the Root DB Barrel

**Problem:** `packages/domain/src/codecamp/progress.ts` imports
`PORTFOLIO_PROJECTS` from `@reading-advantage/db`, dragging 236 KB of seed data
into every consumer of the domain module.

**Change:**

- Import `PORTFOLIO_PROJECTS` from `@reading-advantage/db/seed`.
- Ensure the `./seed` subpath export is configured in `packages/db/package.json`.
- Update any other consumers identified by `grep`.

---

### FR-18: Resolve Long-Lived Stashes

**Problem:** Four stashes are present, including the db-ledger Phase-3 WIP and
an auth-security session-token hardening stash. Stashes are not durable
project history.

**Change:**

- Pop the db-ledger stash and commit its contents (FR-1).
- Inspect the auth-security stash; either commit the FR-1 `validateSession`
  token fix or discard it if it is now obsolete.
- Drop stashes that contain only abandoned work.
- Document any intentionally deferred work in `tech-debt.md`, not in stashes.

---

### FR-19: Remove Residual `as` Casts in Auth Code

**Problem:** New auth code still uses `as UserContext["role"]`,
`as "STUDENT" | "TEACHER" | "ADMIN" | "SYSTEM"`, and the `handleRegister`
`AuthError` cast.

**Change:**

- Derive role literals from the typed `Role` union exported by
  `@reading-advantage/auth`.
- Replace audit-context role casts with a typed helper or by reusing the
  session user's already-typed role.

---

## Non-Functional Requirements

- All new and updated tests must fail Red before implementation and pass Green
  after.
- No skipped tests without a linked issue or a `TODO` with a hard date.
- A clean `git status` is required at the end of every phase.
- Every changed public function keeps JSDoc per `AGENTS.md`.
- Target coverage: ≥ 80% for changed code.

## Acceptance Criteria

1. `packages/db` Phase-2 Red tests pass Green and the Phase-3 work is
   committed, not stashed.
2. `env-guards.test.ts` proves runtime behavior, not source-text regex matches.
3. `journal-integrity.test.ts` imports `sentinelProbes` from TypeScript source;
   no generated `.js` artifacts are left untracked.
4. `createSession` caps only non-expired sessions and is race-safe.
5. `Session` type no longer includes the dormant `token` field.
6. No `it.skip` stub cleanup tests remain in the auth-security test suite.
7. `deleteSession` distinguishes missing rows from real errors.
8. Audit-event failures are logged or awaited; they are not silently dropped.
9. `handleResetPassword` does one session lookup, scopes target queries, and
   errors when no credential account exists.
10. `handleRegister` uses `instanceof AuthError`.
11. Crypto tests do not flake due to timeout on this hardware.
12. `phase-6-acceptance.test.ts` passes from a clean worktree.
13. `phase-7-closeout.test.ts` no longer contains hardcoded SHAs or line-cap
    assertions.
14. Warm `GET /en/` latency is measured in production and either passes the
    1000ms budget or generates a concrete follow-up track.
15. `PORTFOLIO_PROJECTS` is imported only from `@reading-advantage/db/seed`.
16. No non-trivial stashes remain; all deferred work is in `tech-debt.md` or a
    follow-up track.
17. Affected packages pass `test`, `check-types`, and `build` gates.

## Out of Scope

- New auth features (OAuth, self-service password change, MFA).
- Postgres-backed rate-limiter v2 (tracked separately).
- Deploy gates for apps other than codecamp-advantage (pattern documented in
  db-ledger track).
- Dropping the legacy `sessions.token` column (zero-downtime follow-up after
  all apps are known to use `tokenHash`).
