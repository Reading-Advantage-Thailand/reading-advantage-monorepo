# Plan: CodeCamp Progress Monotonicity

## Phase 1: Diagnose and Repair Production

- [x] Task: Trace GitHub PR #1 through GitHub, Cloud Run logs, and production DB.
- [x] Task: Identify the downgrade caller and verify blast radius.
- [x] Task: Repair Pkalakorn's affected production progress row.

## Phase 2: Prevent Regression

- [x] Task: Add a failing regression test for monotonic completed progress.
- [x] Task: Preserve completed status in the shared CodeCamp progress upsert.
- [x] Task: Run targeted domain tests, typecheck, and lint.
- [x] Task: Update `graph.db` for the modified exported function.

Verification:

- Source/test commit: `64678c81`.
- Regression test failed before implementation and passed after implementation.
- `pnpm --filter @reading-advantage/domain test`: 282 passed, 5 skipped.
- `pnpm --filter @reading-advantage/domain check-types`: passed.
- `pnpm --filter @reading-advantage/domain lint`: 0 errors, 9 pre-existing warnings.
- Local CodeCamp build reached the app build and failed on an external
  `fonts.gstatic.com` timeout; the isolated production Cloud Build passed.

## Phase 3: Production Verification

- [x] Task: Deploy the fix to CodeCamp production.
- [x] Task: Verify the affected lesson and approved-PR consistency queries in production.

Production evidence:

- Repaired Pkalakorn's exercise row from `in_progress` to `completed`; Vitest module is
  `5/5` completed.
- Built/deployed a production-matched one-file hotfix with Cloud Build
  `99666d94-a6ce-4a0e-9e55-134d6898e513`; revision `codecamp-advantage-00017-9tv`.
- Homepage returned 200; unsigned webhook and unauthenticated submission returned 401.
- New revision produced no error logs during verification.
- Production DB: 0 contradictory progress rows and 0 approved PRs with incomplete
  exercise lessons.
- Rolled-back production transaction proved the monotonic conflict expression preserves
  `completed` when a later `in_progress` row is proposed.
