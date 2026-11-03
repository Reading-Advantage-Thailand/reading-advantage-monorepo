# Pilot report: codecamp-advantage tests

Base commit: `01f2acfe8ae9d9ef88c2a62cb425992a00261bab`. Branch: `pilot/cloud-codecamp-tests`.

## Result

`./node_modules/.bin/turbo run build check-types test --filter=codecamp-advantage` exits 0 after the fix.
codecamp-advantage: 68 test files passed, 1 skipped (69). 1112 tests passed, 200 skipped (1312). 45/45 turbo tasks succeeded.

## Errors and causes

Both known failures are in
`apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-10-edge-cases-and-production-scenarios.test.ts`:

1. "auth session schema pins the DB session lifetime to 7 days": `createSession must pin expiresAt to now + 7 days`
2. "all Phase 10 P2 acceptance criteria are met (launch gate)": `Phase 10 P2 launch gate - 1 critical source/artifact item(s) missing`

Both tests run the same regex against `packages/auth/src/session.ts`:
`expiresAt\s*=\s*new\s*Date\(\s*Date\.now\(\)\s*\+\s*7\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000`.

**The test is out of date. The code is correct.** Commit `cc10574c9` ("feat(auth): add student session
policy, 0064 (track_id: primary_student_login_20261003)", 2026-10-05) changed the line:

```diff
-  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
+  const expiresAt = opts?.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
```

The default lifetime is still 7 days. The cookie `maxAge` in `packages/api/src/routes/auth/login.ts:50` is still
`7 * 24 * 60 * 60`. A caller may now pass `opts.expiresAt`. The student policy does this, and at
`login.ts:323` it gives the student cookie the same `expires`, so the cookie and the DB row still agree.
Because of the new `opts?.expiresAt ??` text, the regex no longer matched. (`git log -S "opts?.expiresAt ??"` and
`git blame -L 67,67 packages/auth/src/session.ts` both point to `cc10574c9`.) The test was last changed in `89a71da50`.

## Fix

Commit `fdc25aa98` changes only the test file. Both regexes (lines ~500 and ~906) now match the committed line:
`expiresAt\s*=\s*opts\?\.expiresAt\s*\?\?\s*new\s*Date\(\s*Date\.now\(\)\s*\+\s*7\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000`.
The assertion still requires a 7-day default and fails if the default changes. A comment now mentions the override.
No production code, session lifetime, or lockfile was changed. No skip, ts-ignore, or eslint-disable was added.

## Commands and exit codes

| Step | Command | Exit | Notes |
|------|---------|------|-------|
| 1 | `git fetch --unshallow` | 0 | |
| 2 | `pnpm install --frozen-lockfile` | 0 | Warning: could not create the `tutorial-check` bin in packages/domain (dist not built yet). Harmless. |
| 3 | `turbo run build check-types test --filter=codecamp-advantage` (before) | 2 | Failed at `@reading-advantage/db#check-types` (see below); 27/33 tasks |
| 3b | same command with `--continue` (before) | 2 | codecamp: 2 failed, 1110 passed, 200 skipped (1312); 43/45 tasks |
| 6 | same command (after fix) | 0 | 1112 passed, 200 skipped (1312); 45/45 tasks |
| 6b | same command with `--continue` (after fix) | 0 | same counts |

## Failures left (outside apps/codecamp-advantage, not fixed)

- **`@reading-advantage/db#check-types` (flaky, depends on build order).** On the first, cold run it fails with TS2307
  `Cannot find module '../../../domain/dist/...'` and `'../../../sales-knowledge/dist/index.js'` (plus a follow-on TS7006) in
  `packages/db/src/__tests__/sales-phase2-review-a-durable.red.test.ts` (added in `63f1ec7e8`) and
  `sales-phase2-transaction-atomicity.red.test.ts` (added in `628468dae`). Both commits belong to track `sales_mastery_consumer_20260810`.
  These tests import other packages' `dist/` output through relative paths. `packages/db/package.json` does not declare those packages,
  so turbo does not build `domain` or `sales-knowledge` before `db#check-types`. Once their `dist` exists, the task passes,
  which is why later runs pass. A fresh CI checkout can still fail on it. The fix belongs in `packages/db` (or the turbo
  pipeline) and is out of scope here.
