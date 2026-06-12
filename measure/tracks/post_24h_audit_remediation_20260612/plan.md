# Implementation Plan: Post-24h Audit Remediation

## Phase 1: Rescue DB Migration Ledger Phase-3 Green WIP

> This phase is first because the db-ledger fix is Critical and currently lives
> only in `stash@{0}`. Losing the stash would restore the non-monotonic journal
> that silently skips migrations in production.

- [x] Task 1: Inspect `stash@{0}` contents and separate auth-security changes
  - [x] `git stash show -p stash@{0}` to list files
  - [x] Identify and isolate `packages/api/src/__tests__/reset-password.test.ts`
        cast fix (belongs to auth-security track, not db-ledger) — already committed by auth-security track
  - [x] Identify and isolate any other non-db changes — all stash changes are db-ledger or db-related

- [x] Task 2: Land journal re-stamp and doctor implementation
  - [x] Pop the db-ledger portion of the stash (or apply selectively) — stash@{0} already applied to worktree
  - [x] Verify `packages/db/drizzle/meta/_journal.json` is strictly monotonic
        and `0018_audit_events` / `0019_session_token_hash` are registered
  - [x] Verify `packages/db/scripts/migration-ledger-doctor.ts` implements
        `--check` and `--repair` with correct exit codes
  - [x] Commit 4d73a926

- [x] Task 3: Land ESM `.js` extension fix
  - [x] Verify all relative imports/exports in `packages/db/src` use `.js`
  - [x] Rebuild `packages/db`
  - [x] Verify `node --input-type=module -e "import('./dist/index.js')"` resolves
  - [x] Commit 6891639e

- [x] Task 4: Land client / privileged env guards
  - [x] Verify `client.ts` throws in production runtime without `DATABASE_URL`
        and warns in dev/build
  - [x] Verify `privileged.ts` warns on `DATABASE_URL` fallback
  - [x] Commit 5215d944

- [x] Task 5: Land sessions indexes migration
  - [x] Verify `drizzle/0020_sessions_indexes.sql` exists and is registered
  - [x] Verify matching `index()` entries in `packages/db/src/schema/users.ts`
  - [x] Commit c080e2c2

- [x] Task 6: Land barrel hygiene
  - [x] Verify `src/index.ts` no longer exports `PORTFOLIO_PROJECTS`
  - [x] Verify `src/seed/index.ts` exports `PORTFOLIO_PROJECTS`
  - [x] Verify `src/shutdown.ts` is deleted
  - [x] Commit b3f6324a

- [x] Task 7: Verify Phase-2 Red tests are now Green
  - [x] `pnpm vitest run src/__tests__/journal-integrity.test.ts` — 9/9 passed
  - [x] `pnpm vitest run src/__tests__/barrel-hygiene.test.ts` — 6/6 passed
  - [x] `pnpm vitest run src/__tests__/env-guards.test.ts` — 4/4 passed
  - [x] `pnpm vitest run src/__tests__/package-esm-smoke.test.ts` — 3/3 passed
  - [ ] `PG_TEST_URL=… pnpm vitest run src/__tests__/stale-ledger.test.ts` — needs live PG (podman rootless networking blocks host access)
  - [ ] `PG_TEST_URL=… pnpm vitest run src/__tests__/ledger-doctor.test.ts` — needs live PG (podman rootless networking blocks host access)

- [ ] Task: Measure - User Manual Verification 'Phase 1: Rescue DB Migration Ledger Phase-3 Green WIP' (Protocol in workflow.md)

---

## Phase 2: Auth Security Hardening Cleanup

> Addresses lazy code, weak tests, and deferred verification left in the
> auth-security track.

- [ ] Task 8: Remove skipped stub tests
  - [ ] Delete `packages/api/src/__tests__/auth-security-phase3-stub-cleanup.test.ts`
  - [ ] If the skipped assertions had residual value, rewrite them as positive
        behavioral tests
  - [ ] Commit

- [ ] Task 9: Harden session cap
  - [ ] Count only non-expired sessions (`expiresAt > now`)
  - [ ] Wrap count + delete + insert in a transaction
  - [ ] Update `packages/auth/src/__tests__/session.test.ts` Phase-2 Task 10
  - [ ] Commit

- [ ] Task 10: Remove legacy `token` from `Session` return type
  - [ ] Update `packages/auth/src/session.ts` `Session` interface
  - [ ] Update `validateSession` return value
  - [ ] Update `server.ts` / `getSession` / `requireAuth` callers and tests
  - [ ] Keep raw token available to cookie-setting callers via a separate
        narrower type if needed
  - [ ] Commit

- [ ] Task 11: Replace `createSession` insert type cast
  - [ ] Use `InferInsertModel` or inline typed values
  - [ ] Remove the `Parameters<typeof db.insert>[0] extends …` cast
  - [ ] Commit

- [ ] Task 12: Harden `deleteSession` error handling
  - [ ] Catch only the expected "not found" condition
  - [ ] Let unexpected DB errors propagate
  - [ ] Commit

- [ ] Task 13: Harden audit event emission
  - [ ] Add `console.error`/logger call inside the `.catch()` for login and
        reset-password audit events, OR await the event on success paths
  - [ ] Update tests to assert failure is observable
  - [ ] Commit

- [ ] Task 14: Harden `handleResetPassword`
  - [ ] Use `requireRole` once and reuse its session
  - [ ] Scope target-user lookup by school for TEACHER actors
  - [ ] Verify credential account exists before update; return 400 if missing
  - [ ] Commit

- [ ] Task 15: Clean up `handleRegister` error handling
  - [ ] Import `AuthError` and use `instanceof`
  - [ ] Remove `error.name === "AuthError"` string check and cast
  - [ ] Commit

- [ ] Task 16: Fix crypto test flakiness
  - [ ] Increase timeout for bcrypt/Argon2id tests in
        `packages/auth/src/__tests__/password.test.ts`
  - [ ] Optionally mock the hashing functions for the migration-path unit test
  - [ ] Commit

- [ ] Task 17: Remove residual `as` casts in auth code
  - [ ] Replace role casts in `session.ts`, `login.ts`, `reset-password.ts`
  - [ ] Derive audit-context role from typed `Role`
  - [ ] Commit

- [ ] Task 18: Manual verification of auth flows
  - [ ] Local login → reset password → verify old session cookie returns 401
  - [ ] Verify unknown-username vs wrong-password timing is within 5ms
  - [ ] Verify audit events are recorded (or logged on failure)
  - [ ] Document evidence in plan.md

- [ ] Task: Measure - User Manual Verification 'Phase 2: Auth Security Hardening Cleanup' (Protocol in workflow.md)

---

## Phase 3: CodeCamp Review Closeout Test Cleanup

> The review-consolidation track is functionally correct, but its closeout
> tests are brittle and one acceptance test is currently broken.

- [ ] Task 19: Diagnose and fix `phase-6-acceptance.test.ts`
  - [ ] Reproduce the `@reading-advantage/db` entry-resolution failure
  - [ ] Determine root cause: stale `dist/`, `exports` map, or mock ordering
  - [ ] Fix and verify the test passes from a clean worktree
  - [ ] Commit

- [ ] Task 20: Refactor `phase-7-closeout.test.ts`
  - [ ] Remove hardcoded commit SHAs; derive from `git log` or `plan.md`
  - [ ] Move line-cap enforcement to a CI lint / pre-commit check; delete
        line-cap assertions from the test
  - [ ] Remove git-state/markdown assertions that test Measure bookkeeping
        rather than product behavior
  - [ ] Keep only behavior/source assertions (e.g., no inline OpenRouter calls)
  - [ ] Commit

- [ ] Task 21: Verify webhooks package gates
  - [ ] `CI=true pnpm --filter @reading-advantage/webhooks test`
  - [ ] `pnpm --filter @reading-advantage/webhooks check-types`
  - [ ] Commit any remaining fixes

- [ ] Task: Measure - User Manual Verification 'Phase 3: CodeCamp Review Closeout Test Cleanup' (Protocol in workflow.md)

---

## Phase 4: CodeCamp Progress & Dashboard Cleanup

- [ ] Task 22: Migrate `PORTFOLIO_PROJECTS` import to seed subpath
  - [ ] Update `packages/domain/src/codecamp/progress.ts`
  - [ ] Update `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-4-feature-parity.test.ts`
  - [ ] Verify `packages/db/package.json` `"./seed"` export is correct
  - [ ] Commit

- [ ] Task 23: Production warm-dashboard verification
  - [ ] Deploy or identify a production-like environment with prod reach
  - [ ] Run `PHASE6_SKIP=0 pnpm --filter=codecamp-advantage exec vitest run \
        lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts`
  - [ ] Record result; if warm `GET /en/` ≥ 1000ms, file a follow-up track
  - [ ] Update `measure/tracks/codecamp_perf_warm_dashboard_20260608/plan.md`
        with the measurement
  - [ ] Commit evidence or follow-up track creation

- [ ] Task 24: Tidy `updateUserProgress` monotonic guard (optional refactor)
  - [ ] If the raw `sql` fragments can be expressed cleanly with Drizzle's
        typed helpers, refactor; otherwise document why raw SQL is required
  - [ ] Commit only if changed

- [ ] Task: Measure - User Manual Verification 'Phase 4: CodeCamp Progress & Dashboard Cleanup' (Protocol in workflow.md)

---

## Phase 5: Cross-Cutting Hygiene

- [ ] Task 25: Resolve all remaining stashes
  - [ ] Commit or drop `stash@{0..N}` after Phase 1
  - [ ] Inspect `mid-phase4-fr1-session-validateSession-token-hardening-deferred-for-jr`
  - [ ] Document any deferred work in `measure/tech-debt.md`
  - [ ] Commit

- [ ] Task 26: Add generated-artifact ignores
  - [ ] Add `packages/db/scripts/*.js`, `packages/db/scripts/*.d.ts*`, and
        `packages/db/tsconfig.build.json` (if generated) to `.gitignore`,
        OR make the build clean step remove them
  - [ ] Commit

- [ ] Task 27: Update registry status
  - [ ] Flip `measure/tracks.md` entry for `auth_security_hardening_20260611`
        to `[x]` if Phase 4 is truly complete after Phase 2 cleanup
  - [ ] Flip `measure/tracks.md` entry for `db_migration_ledger_20260611` to
        `[x]` if Phase 3/4 are complete after Phase 1
  - [ ] Add/update this remediation track entry as appropriate
  - [ ] Commit

- [ ] Task: Measure - User Manual Verification 'Phase 5: Cross-Cutting Hygiene' (Protocol in workflow.md)

---

## Phase 6: Final Verification & Closeout

- [ ] Task 28: Run full test suites for affected packages
  - [ ] `CI=true pnpm --filter @reading-advantage/auth test`
  - [ ] `CI=true pnpm --filter @reading-advantage/db test`
  - [ ] `CI=true pnpm --filter @reading-advantage/api test`
  - [ ] `CI=true pnpm --filter @reading-advantage/webhooks test`
  - [ ] `CI=true pnpm --filter @reading-advantage/domain test`

- [ ] Task 29: Run type-check and build gates
  - [ ] `pnpm turbo run check-types --filter=@reading-advantage/auth --filter=@reading-advantage/db --filter=@reading-advantage/api --filter=@reading-advantage/webhooks --filter=@reading-advantage/domain --filter=codecamp-advantage`
  - [ ] `pnpm turbo run build --filter=@reading-advantage/auth --filter=@reading-advantage/db --filter=@reading-advantage/api --filter=@reading-advantage/webhooks --filter=@reading-advantage/domain --filter=codecamp-advantage`

- [ ] Task 30: Update project memory
  - [ ] Add any new tech-debt rows for intentionally deferred work
  - [ ] Add lessons-learned entries for: rescue-stash discipline,
        source-text-test anti-pattern, closeout-test brittleness
  - [ ] Commit

- [ ] Task 31: Closeout
  - [ ] Move this track to `measure/archive/post_24h_audit_remediation_20260612/`
  - [ ] Update `measure/tracks.md` entry to `[x]` with archive link
  - [ ] Attach `git notes` to the closeout commit
  - [ ] Commit

- [ ] Task: Measure - User Manual Verification 'Phase 6: Final Verification & Closeout' (Protocol in workflow.md)
