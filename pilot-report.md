# Pilot report: packages/api coverage tests

## Summary

- Scope: the 9 packages/api files under 60% line coverage in `coverage-gaps-report.md`.
- I changed only test files. I changed no source file.
- Package lines rose from 66.93% to 90.32%. Branches rose from 56.44% to 83.00%.
- No packages/api file stays under 60% line coverage.
- I added 7 test files and 141 tests. All 496 tests pass.
- The tests found no real defect. The "Observations" section lists 4 weak points that I did not mark as defects.

## Coverage per file

| File | Lines before | Lines after | Branches before | Branches after |
|---|---:|---:|---:|---:|
| `src/routes/apk-challenges/index.ts` | 0% (0/87) | 100% (87/87) | 0% (0/84) | 100% (84/84) |
| `src/routes/auth/session.ts` | 0% (0/8) | 100% (8/8) | 0% (0/14) | 100% (14/14) |
| `src/routes/auth/logout.ts` | 0% (0/6) | 100% (6/6) | 0% (0/2) | 100% (2/2) |
| `src/routes/auth/impersonate.ts` | 21.87% (7/32) | 100% (32/32) | 18.75% (3/16) | 100% (16/16) |
| `src/routers/sales.ts` | 55% (44/80) | 97.5% (78/80) | 58.53% (24/41) | 95.12% (39/41) |
| `src/routers/reports.ts` | 50% (2/4) | 100% (4/4) | no branches | no branches |
| `src/routes/activity/index.ts` | 0% (0/9) | 100% (9/9) | 0% (0/8) | 100% (8/8) |
| `src/root.ts` | 0% (0/2) | 100% (2/2) | no branches | no branches |
| `src/sales-root.ts` | 0% (0/1) | 100% (1/1) | no branches | no branches |
| Package total | 66.93% (498/744) | 90.32% (672/744) | 56.44% (289/512) | 83.00% (425/512) |

`src/routers/sales.ts:125` and `:151` stay uncovered. `protectedProcedure` rejects an anonymous caller first, so tests cannot reach these lines.

## Tests added

Each test file is in `packages/api/src/__tests__/`.

- `apk-challenge-routes.test.ts` (64 tests): covers cookie parsing, failed session lookups, sessions without a school, role checks, query allowlists, and paging limits.
  - It also covers the same-origin check (missing, other scheme, other port, `null`, unparsable URL) and capability mismatches.
  - It covers error mapping to 401, 403, 404, 409, and 500, and public contract enforcement.
- `auth-session-logout-routes.test.ts` (11 tests): covers missing and invalid tokens, row enrichment, default fields, and tenant source.
  - It also covers logout session deletion, cookie clearing, the production secure flag, and failure propagation.
- `auth-impersonate-route.test.ts` (9 tests): covers the exact flag value, input validation, and the non-demo id refusal.
  - It also covers demo school and user creation, the credential account, the session cookie, rollback on failure, and structured error logs.
- `sales-router-coverage.test.ts` (36 tests): covers role and scope checks, the five unread procedures, quiz submission, content approval, and admin-only access.
  - It also covers each typed error mapping, error detail redaction, and the structured log event.
- `reports-router-coverage.test.ts` (8 tests): covers `studentProgress` and `classAnalytics` delegation, anonymous refusal, input checks, and output contract failures.
- `activity-http-route.test.ts` (11 tests): routes each of the 8 operations to its handler only, and checks the mounted routers of `appRouter`.
- `sales-root.test.ts` (2 tests): checks that `salesAppRouter` mounts the sales router only.

## Real defects found

None. Every test passes against the committed behavior. No test uses `it.fails`.

## Observations (not marked as defects)

- `src/routes/auth/impersonate.ts:56`: a malformed JSON body returns 500, not 400. The endpoint works only in development behind a flag.
- `src/routes/auth/impersonate.ts:126`: impersonation creates a session but writes no audit event. AGENTS.md asks for audit events on security actions.
- `src/routes/auth/session.ts:35`: the handler selects `users.schoolId` and never uses it. The response uses the session school.
- `src/routes/activity/index.ts:43`: an unknown operation returns `undefined`. The type union blocks this at compile time, but nothing blocks it at runtime.

## Commit track IDs

- The commit hook requires a track ID on every `test` commit.
- `git log` shows track IDs for `sales.ts`, `reports.ts`, `activity/index.ts`, `root.ts`, and `sales-root.ts`. I used those IDs.
- `git log` shows no track ID for the auth routes. I used `auth_security_hardening_20260611`, whose spec covers session, logout, and impersonation.
- `git log` shows no track ID for `apk-challenges/index.ts`. I used `apk3d_games_port_20261003`, the track of its domain module `packages/domain/src/challenges`.

## Commands

| Command | Exit code | Result |
|---|---:|---|
| `git fetch --unshallow` | 0 | Full history fetched. |
| `pnpm install --frozen-lockfile` | 0 | No lockfile change. |
| `vitest run --coverage` in packages/api, before the build | 1 | 31 of 42 files failed. Workspace `dist/` output was missing. |
| `./node_modules/.bin/turbo run build --filter='@reading-advantage/api^...'` | 0 | 16 of 16 dependency builds passed. |
| `vitest run --coverage --coverage.reportOnFailure --coverage.include='src/**/*.ts'` (before) | 0 | 42 files, 355 passed, 0 failed, 0 skipped. |
| Same coverage command (after) | 0 | 49 files, 496 passed, 0 failed, 0 skipped. |
| `tsc --noEmit -p packages/api` | 0 | No type errors. |
| `eslint .` in packages/api | 0 | 0 errors. 2 old warnings in `reset-password.test.ts`. |

- The `vitest` and `tsc` commands ran from `../../node_modules/.bin/`.
- Both coverage runs excluded `src/**/__tests__/**` and `src/**/*.test.ts`.
- No test needs a database or a secret. No test skips.
