# Implementation Plan: Class sign-in session lifetime choice

> **Track ID:** `primary_class_session_lifetime_20261111` · **Spec:** [spec.md](./spec.md)
> **Dates:** Target on master by 2026-11-18. Priority P1. No deploy.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b] … deferred:<owner>` at a human gate. An `[x]` note names the commit and the evidence class: automated, person-checked, or owner-passed.
- Tests first. The Red test fails at HEAD for the stated reason. The Green change is the minimum.
- Red runs on a model family other than the Green family. The orchestrator sets the models.
- Stage named paths only. Never run `git add -A` or `git add .`. Commit with `git commit -m <msg> -- <paths>`.
- No push, no deploy, no amend, no `--no-verify`, no `git reset`, `checkout`, `restore`, `revert`, or `stash`, and no `git worktree add`.
- The test runner of both packages is Vitest. Every named-file command carries `CI=true` and `--maxWorkers=1`. Domain: `CI=true pnpm --filter @reading-advantage/domain exec vitest run --maxWorkers=1 <files>`. App: `CI=true pnpm --filter primary-advantage exec vitest run --maxWorkers=1 <files>`.
- Heavy steps (type checks, builds, full suites) run through `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`. Run one job at a time. Storytime keeps the first claim on the heavy lock.
- The Primary app has pre-existing ESLint errors. Lint only the changed files: `pnpm --filter primary-advantage exec eslint <changed files>` and `pnpm --filter @reading-advantage/domain exec eslint <changed files>`.
- No database change, no migration, no new hash, checksum, or manifest (`AGENTS.md`).
- Commit headers are 100 characters or less and use a lower-case subject. Each header carries `(track_id: primary_class_session_lifetime_20261111)`. The suffix uses 52 characters, so the type and the subject use 48 characters or less.
- Respect `AGENTS.md`: business logic stays in the domain package, Zod contracts first, thin handlers and thin UI, JSDoc on every exported function and type, tests with the change.
- Paths start at the monorepo root.

## Phase 1: Choice of the class session lifetime

Blast radius: `startClassSession` and `classSessionStartInput` in `packages/domain/src/student-login/`, the `startClass` handler and the `STATUS` map in `apps/primary-advantage/lib/student-login/`, `ClassSessionControl` in `apps/primary-advantage/components/teacher/class-login/`, and the `ClassLogin` messages (`th`, `en`). Check the callers of each exported symbol with `build-graph callers ./graph.db <symbol>` before the edit.

- [ ] 1.1 Red: domain tests. Edit `packages/domain/src/__tests__/student-login-class-session.test.ts`, `student-login-contracts.test.ts`, and `student-login-card.test.ts`. Red edits no other file.
  - Contract: `lifetime` accepts `'3h'`, `'until_17'`, and `'7d'`; a missing value parses to `'3h'`; `'1d'`, `'30d'`, `''`, `7`, and `null` fail.
  - Expiry: with `NOW` fixed, `'3h'` and no value give `NOW + 3 h`; `'7d'` gives `NOW + 7 d`; `'until_17'` gives 17:00 Asia/Bangkok of the Bangkok date (use 2026-11-11T05:00:00Z, which is 12:00 Bangkok, and expect 2026-11-11T10:00:00Z).
  - Limit: at 2026-11-11T09:59:59Z (16:59:59 Bangkok) `'until_17'` works. At 10:00:00Z and at 2026-11-11T16:59:00Z (23:59 Bangkok) it throws `StudentLoginError` with code `invalid_input`, inserts no row, closes no old session, and writes no audit line. At 2026-11-11T17:30:00Z (00:30 on 2026-11-12 in Bangkok) it works and gives 2026-11-12T10:00:00Z.
  - Audit: the `class_start` metadata holds `lifetime` with the chosen value, `sessionId`, and `expiresAt`.
  - Refused value: a direct call with an unknown value (cast) throws and inserts no row.
  - Expiry still fails: for each choice, a class code lookup and a card sign-in succeed before `expiresAt` and fail at and after it (use the mock-db pattern of the existing tests; keep the real-db file unchanged unless it already has a start call, then extend it).
  - Red expectation: the new cases fail at HEAD because the contract has no `lifetime` and the domain uses the fixed 3 hours. A failure for a syntax or import error is not a valid Red.
  - Red command: `CI=true pnpm --filter @reading-advantage/domain exec vitest run --maxWorkers=1 src/__tests__/student-login-class-session.test.ts src/__tests__/student-login-contracts.test.ts src/__tests__/student-login-card.test.ts`. Record the real counts `tests_total`, `tests_failed`, and `tests_passed`.
  - Red commit: `test(domain): pin the class session lifetime (track_id: primary_class_session_lifetime_20261111)`, with the test files only.
- [ ] 1.2 Red: handler and panel tests. Edit `apps/primary-advantage/lib/__tests__/student-login-handlers.test.ts`, `components/__tests__/class-session-control.test.tsx`, and `components/__tests__/class-login-panel.test.tsx` when it needs a new case. Red edits no other file.
  - Handler: a body with `lifetime: '7d'` reaches `startClassSession` with that input; a body with `'30d'` returns 400 and does not call the domain; a body with no `lifetime` returns 200 and the domain receives `'3h'`; a domain `invalid_input` error returns 400 with the code `invalid_input`; the response drops unknown fields (existing case stays).
  - Panel: the control shows three options in `en` and in `th`; "3 hours" is selected by default; a click on "7 days" then Start posts `{ classroomId, lifetime: '7d' }` to `/api/auth/student/class-session/start`; New code posts the selected value; with the clock at 17:00 Bangkok or later "Until 17:00 today" is not shown; with the clock before 17:00 it is shown; the shown end time comes from the server `expiresAt`, and a `7d` result shows the date; a 400 with `invalid_input` shows a clear error and not the generic one.
  - Fix the clock with `vi.useFakeTimers()` and `vi.setSystemTime`.
  - Red expectation: the new cases fail at HEAD because the control has no choice and the handler contract has no field.
  - Red commands: `CI=true pnpm --filter primary-advantage exec vitest run --maxWorkers=1 lib/__tests__/student-login-handlers.test.ts components/__tests__/class-session-control.test.tsx components/__tests__/class-login-panel.test.tsx`. Record the real counts.
  - Red commit: `test(primary): pin the lifetime choice (track_id: primary_class_session_lifetime_20261111)`, with the test files only.
- [ ] 1.3 Green: contract. Edit `packages/domain/src/student-login/contracts.ts`: add the exported `classSessionLifetime` enum (`'3h'`, `'until_17'`, `'7d'`) and the optional field `lifetime` with default `'3h'` in `classSessionStartInput`. Export the type. Write the JSDoc without types. Gate: `CI=true pnpm --filter @reading-advantage/domain exec vitest run --maxWorkers=1 src/__tests__/student-login-contracts.test.ts`. Expect exit 0.
- [ ] 1.4 Green: error code. Add `"invalid_input"` to `StudentLoginErrorCode` in `packages/domain/src/student-login/errors.ts` and its status 400 to `STATUS` in `apps/primary-advantage/lib/student-login/http.ts`. Check each other `Record<StudentLoginErrorCode, ...>` with `build-graph callers` and `grep`. Gate: type check in task 1.11.
- [ ] 1.5 Green: domain. Edit `packages/domain/src/student-login/class-session.ts`. A small pure function computes `expiresAt` from the choice and `now` with `calendarDayKey` and `SCHOOL_TIME_ZONE` from `../calendar-day.js` (no new dependency; Thailand has no daylight saving, so 17:00 Bangkok is `${dayKey}T10:00:00Z`). It throws `StudentLoginError("invalid_input", ...)` for `'until_17'` at 17:00 Bangkok or later and for an unknown value, and it runs before the old session closes (before `class-session.ts:86`). `startClassSession` uses it at the place of `class-session.ts:124`, and the audit metadata adds `lifetime`. Keep `CLASS_SESSION_LIFETIME_MS` exported for the 3-hour value. Update the JSDoc (`@param params.input`, `@throws`). Gate: `CI=true pnpm --filter @reading-advantage/domain exec vitest run --maxWorkers=1 src/__tests__/student-login-class-session.test.ts src/__tests__/student-login-card.test.ts src/__tests__/student-login-contracts.test.ts`. Expect exit 0.
- [ ] 1.6 Green: handler. `apps/primary-advantage/lib/student-login/handlers.ts` needs no new logic: it already passes the parsed input. Check that the test of task 1.2 passes. If it needs a change, keep the handler thin. Gate: `CI=true pnpm --filter primary-advantage exec vitest run --maxWorkers=1 lib/__tests__/student-login-handlers.test.ts`. Expect exit 0.
- [ ] 1.7 Green: teacher panel. Edit `apps/primary-advantage/components/teacher/class-login/class-session-control.tsx` (and `api.ts` for an `invalid_input` error key, and `class-login-panel.tsx` only if it needs it): a radio group of the options, "3 hours" selected by default, "Until 17:00 today" hidden at Bangkok 17:00 or later (clock through `calendarDayKey`-style `Intl` with `SCHOOL_TIME_ZONE`, from `@reading-advantage/domain/calendar-day`), the selected value in the start body, the server `expiresAt` in the text with the date for a later Bangkok date (D-6). Each option has a target of 44 px or more and a visible label (no color alone). Keep the component thin. Gate: `CI=true pnpm --filter primary-advantage exec vitest run --maxWorkers=1 components/__tests__/class-session-control.test.tsx components/__tests__/class-login-panel.test.tsx`. Expect exit 0.
- [ ] 1.8 Green: `th` and `en` strings. Add the keys of task 1.9 to `apps/primary-advantage/messages/en.json` and `th.json` under `ClassLogin`, in the same order in both files. Check that the message files stay valid JSON and that other locale files need no key (they fall back as today). Gate: the panel tests of task 1.7 in `th` and in `en`.
- [ ] 1.9 Strings list (for the Thai check). Each new key and its `en` text. The Thai text is a draft that Daniel checks.
  - `ClassLogin.session.lifetimeLabel` — "How long should sign-in stay open?"
  - `ClassLogin.session.lifetime.3h` — "3 hours"
  - `ClassLogin.session.lifetime.until_17` — "Until 17:00 today"
  - `ClassLogin.session.lifetime.7d` — "7 days"
  - `ClassLogin.session.lifetimeHelp7d` — "Students can use their cards at home until this time. End the class to stop sign-in earlier." (only when the text is kept after Review B)
  - `ClassLogin.errors.lifetimeInvalid` — "This choice is not available now. Choose another time."
  - The existing keys `openUntil` and `openNoCode` keep their `{time}` placeholder. The value for a later date comes from the formatter (D-6), so no new key is needed unless task 1.7 finds one. Task 1.7 adds any extra key to this list.
- [ ] 1.10 Thai-label hand-off. Send the list of task 1.9, with each key and each `en` text, with the final `th` text from the message file, to the PM orchestrator through the standard message, for Daniel's Thai check (the 11-16 package). Do not change the `th` text before the PM returns the check. `[b] deferred:pm` until the PM returns the check. Evidence class: person-checked.
- [ ] 1.11 Phase check at one HEAD. Run one job at a time.
  - Type checks, through heavy-run p2: `pnpm --filter @reading-advantage/domain check-types` and `pnpm --filter primary-advantage check-types`. Expect exit 0.
  - ESLint on the changed files only (the Primary app has pre-existing errors; the changed files add none).
  - Targeted tests: the named files of tasks 1.1 and 1.2, then the domain suite `CI=true pnpm --filter @reading-advantage/domain test` through heavy-run p2 (expect no new failure against the base HEAD).
  - `git diff --name-only <base>..HEAD -- packages/db` returns an empty list (AC-8).
  - `build-graph update ./graph.db <changed source files>` through heavy-run p2.
  - Record `git rev-parse HEAD`. Evidence class: automated.
- [ ] 1.12 Review and browser gates (the orchestrator runs them; the strategy role sets the exact scope).
  - Review A (correctness) applies. Review B (security) is required: the points of spec section 9, including OQ-1. Review C (API and user flow wiring) applies.
  - Browser check of the teacher panel: one viewport, `th` and `en`: three options, default "3 hours", start with "7 days", expiry text with the date, hide of "Until 17:00 today" after 17:00 Bangkok (fixed clock or test hook), end early. Use a scratch database copy, never the shared `primary_advantage` database. Evidence class: automated or person-checked, as the strategy states.
  - Phase and final acceptance at an immutable HEAD, then closeout.
- [b] 1.13 Merge to master by 2026-11-18. The orchestrator merges after acceptance. Tell the monorepo session before the merge. Evidence class: automated.
- [b] 1.14 Deploy of the Primary Advantage app with this change: deferred:daniel. It ships with the next Primary Advantage deploy, on Daniel's word. No deploy runs from this track.
