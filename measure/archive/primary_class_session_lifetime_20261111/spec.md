# Specification: Class sign-in session lifetime choice

**Track ID:** `primary_class_session_lifetime_20261111`
**Type:** feature (classic FR list with acceptance checks)
**Status:** new. Opened 2026-11-11.
**Author model:** claude-code/claude-sonnet-5-5
**Priority:** P1 (school customer request)
**Target:** on master by 2026-11-18. The change ships with the next Primary Advantage deploy, on Daniel's word.
**Program:** Primary Advantage (`apps/primary-advantage`) with the shared domain package (`packages/domain`).
**Owner chain:** Daniel (owner; deploy gate) → PM orchestrator (request A-53) → Monorepo orchestrator (track owner)
**Plan:** [plan.md](./plan.md)
**Related track:** [primary_student_login_20261003](../../tracks/primary_student_login_20261003/) (built the class session, the QR cards, and the teacher panel).

## 1. Purpose

A teacher starts class sign-in and gets a class code. Today the session lasts 3 hours for every
start. The Boonyathat teacher asks for a longer time on the class sign-in QR code, so that students
use their cards at home. This track lets the teacher choose the time at the start: "3 hours"
(default, as today), "Until 17:00 today" (Asia/Bangkok), or "7 days". The server enforces the
choice list. The picture password and the rate limits do not change.

## 2. Request (PM request A-53, 2026-11-11)

The PM wrote, word for word:

"What: the Boonyathat teacher asks for a longer time on the class sign-in QR code. Today the class sign-in session lasts 3 hours (packages/domain/src/student-login/class-session.ts:28, CLASS_SESSION_LIFETIME_MS = 3 h), and the students' QR cards (card-token.ts:70) work only while that session is open. Change: when the teacher starts class sign-in, she picks the time: \"3 hours\" (default, as today), \"Until 17:00 today\" (Asia/Bangkok), or \"7 days\". The server enforces the choice list (no other value, 7 days maximum); the audit line records the choice; a teacher can still end the session early. Why: our school customer asked (Tasks b1NDWS1V, 2026-11-11). The 7-day choice lets students use their cards at home for a week; the picture password and the rate limits stay as they are. Done-when: one small track on master (domain + teacher panel + th/en strings), tests for the 3 choices and a refused value, Review B (security) pass. The new Thai labels go to me for Daniel's Thai check (11-16 package). It ships with the next Primary Advantage deploy, on Daniel's word (no deploy from you or me). Date: on master by 2026-11-18. Priority: after your running Storytime role; one light role at a time; Storytime keeps first claim on the heavy lock."

## 3. Evidence (read only, 2026-11-11, at 172c52364)

- **Lifetime constant.** `packages/domain/src/student-login/class-session.ts:28` sets
  `CLASS_SESSION_LIFETIME_MS = 3 * 60 * 60 * 1000`. Only `class-session.ts:124` uses it:
  `const expiresAt = new Date(now.getTime() + CLASS_SESSION_LIFETIME_MS);`. No other file in
  `packages/domain/src`, `packages/db/src`, or `apps/primary-advantage` (lib, components, app) reads it.
- **Insert.** `class-session.ts:127-130` inserts the row with `codeHash`, `startsAt: now`, and `expiresAt`.
- **Audit line.** `class-session.ts:136` writes `student_login:class_start` with the metadata
  `{ sessionId, expiresAt }`. `expiresAt` is an ISO string. The action name is typed in
  `packages/domain/src/student-login/audit.ts:5`.
- **Return value.** `class-session.ts:137` returns `{ sessionId, code, expiresAt }`.
- **Restart.** `class-session.ts:86-95` closes each open session of the class before a new start. It
  writes a `class_end` audit line with `reason: "replaced"` when the old session had not yet expired.
  The unique index `primary_class_login_sessions_open_class_idx` (`packages/db/src/schema/primary.ts:281-283`)
  allows one open session for each class.
- **End early.** `endClassSession` (`class-session.ts:152-171`) closes the open session and writes
  `class_end` with `reason: "ended"`.
- **Cards.** `packages/domain/src/student-login/card-token.ts:65-70` joins the credential to an open
  session of the class of the student: `closedAt IS NULL` (`:69`) and `expiresAt > now` (`:70`). A card
  works only while a session of its class is open and unexpired. There is no separate card lifetime.
- **Class code.** `findOpenSession` (`class-session.ts:181-198`) and the collision check
  (`class-session.ts:101-111`) use the same row: `codeHash`, `closedAt IS NULL`, `expiresAt > now`.
  The 7-day choice therefore keeps the class code valid for 7 days (D-3).
- **Code-only sign-in.** When a class turns the picture password off, the class code alone gives a
  `code_only` student session (`packages/domain/src/student-login/picture-password.ts:155`; contract
  `contracts.ts:81`). With the 7-day choice, such a class has a 7-day code-only entry. See OQ-1.
- **Schema.** `primary_class_login_sessions.expires_at` is `timestamp("expires_at").notNull()`
  (`packages/db/src/schema/primary.ts:276`). No database migration is needed (D-8, AC-8).
- **Contracts.** `packages/domain/src/student-login/contracts.ts:38` holds
  `classSessionStartInput = z.object({ classroomId: z.string().uuid() })`. `:44-48` holds
  `classSessionStartOutput` (`sessionId`, `code`, `expiresAt`). `:171` and `:175` export the types.
- **Handler.** `apps/primary-advantage/lib/student-login/handlers.ts:6-8` builds `startClass` with
  `teacherHandler(sl.classSessionStartInput, ...)` and parses the result with `classSessionStartOutput`.
  `teacherHandler` (`lib/student-login/http.ts:81-96`) checks a full session, parses the body with the
  contract, and returns 400 `Invalid input` on a schema failure (`http.ts:67-68`).
- **Error codes.** `StudentLoginErrorCode` (`packages/domain/src/student-login/errors.ts:2-9`) has no
  validation code. `STATUS` in `http.ts:11-19` is a `Record` over the codes, so a new code needs a
  status there (D-2).
- **Panel.** `apps/primary-advantage/components/teacher/class-login/class-session-control.tsx:45` posts
  `{ classroomId }` to `class-session/start`. The end time shows through `session.openUntil`
  and `session.openNoCode` with `time` formatted as hour and minute only (`:62`). `class-login-panel.tsx:74`
  renders the control. `components/teacher/class-login/api.ts` maps a status to an error key
  (`errorKey`, status 400 gives `generic`).
- **Messages.** The strings are under `ClassLogin.session` in `apps/primary-advantage/messages/en.json`
  and `th.json` (from line 2982; `session.startHelp` at line 2995). The keys now are `start`, `startHelp`,
  `codeLabel`, `codeAria`, `openUntil`, `openNoCode`, `newCode`, `end`.
- **Time zone helper.** `packages/domain/src/calendar-day.ts:8` exports `SCHOOL_TIME_ZONE = "Asia/Bangkok"`
  and `calendarDayKey` (`:19`). The module has no database import, so a client component can use it
  through `@reading-advantage/domain/calendar-day`.
- **Existing tests.** Domain: `packages/domain/src/__tests__/student-login-class-session.test.ts`
  (line 48 fixes the 3-hour expiry), `student-login-card.test.ts`, `student-login-contracts.test.ts`,
  `student-login.real-db.test.ts`. Handler: `apps/primary-advantage/lib/__tests__/student-login-handlers.test.ts`.
  Panel: `apps/primary-advantage/components/__tests__/class-session-control.test.tsx` and
  `class-login-panel.test.tsx`. All of them run on Vitest (`packages/domain/vitest.config.ts` and
  `apps/primary-advantage/vitest.config.ts`, script `"test": "vitest run"`). There is no Jest in these two packages.

## 4. Decisions

- **D-1 (input field). DECIDED (PM request A-53; defaults of the build brief, 2026-11-11).**
  `classSessionStartInput` gets the field `lifetime`, an enum of `'3h'`, `'until_17'`, and `'7d'`.
  The default is `'3h'`, so a request without the field behaves as today. The contract refuses any other
  value. 7 days is the maximum. The client never sends a time or a duration.
- **D-2 (until 17:00). DECIDED (build brief, 2026-11-11).** `'until_17'` means 17:00 in Asia/Bangkok
  (`SCHOOL_TIME_ZONE`) on the current Bangkok calendar date of `now`. When the Bangkok time is 17:00 or
  later, the server refuses the choice. The refusal is a new `StudentLoginError` code `invalid_input`
  that the handler maps to HTTP 400. The refusal happens before the old session closes, so a refused
  start changes no row. The panel hides the choice when the Bangkok time is 17:00 or later. A test fixes the clock.
- **D-3 (one session). DECIDED (build brief, 2026-11-11).** The class code and the cards share one
  session row, so both get the chosen time. The picture password and the rate limits do not change.
- **D-4 (audit). DECIDED (build brief, 2026-11-11).** The `class_start` audit line adds
  `lifetime: '<choice>'` next to `sessionId` and `expiresAt`.
- **D-5 (end and restart). DECIDED (build brief, 2026-11-11).** Ending early and restarting stay as today.
  A restart closes the old session and makes a new one with the choice of the new start.
- **D-6 (expiry display). DECIDED (build brief, 2026-11-11).** The panel shows the expiry time that the
  server returns. For a session that ends on a later Bangkok date than today, the shown text includes the
  date, because an hour and minute alone are not clear for 7 days.
- **D-7 (the 3-hour path is unchanged). DECIDED (build brief, 2026-11-11).** `'3h'` gives
  `now + 3 hours`, the same value as today. A caller that sends no `lifetime` gets this value.
- **D-8 (no migration). DECIDED (build brief, 2026-11-11).** No database change. `expires_at` exists.
  The choice is not stored as a column. The audit line holds it (D-4).

## 5. Functional requirements

### FR-1 Contract

`classSessionStartInput` has the optional field `lifetime`, the enum of D-1, with the default `'3h'`.
The inferred type is exported. A value outside the enum fails the parse. The output contract keeps its
three fields.

### FR-2 Domain

`startClassSession` computes `expiresAt` from `input.lifetime` and `now`: `'3h'` gives `now + 3 hours`,
`'7d'` gives `now + 7 days`, and `'until_17'` gives the instant of 17:00 Asia/Bangkok on the Bangkok date
of `now`. At Bangkok 17:00 or later, `'until_17'` throws `StudentLoginError("invalid_input", ...)` before
any row changes. The audit line carries `lifetime`. The domain function is the authority; a direct caller
cannot pass a longer time. `CLASS_SESSION_LIFETIME_MS` stays exported for the 3-hour value, or moves
into a small lifetime table. No other file changes behavior.

### FR-3 Handler

`startClass` passes the parsed input. A refused value gives 400 from the contract. A refused
`'until_17'` gives 400 with the code `invalid_input`. The response body keeps only `sessionId`, `code`,
and `expiresAt`.

### FR-4 Teacher panel

Before a start, the panel shows a choice control with up to three options: "3 hours" (selected by
default), "Until 17:00 today", and "7 days". The control sits next to the Start and New code buttons, and a
new code uses the selected choice. The panel hides "Until 17:00 today" when the Bangkok time is 17:00 or
later. The panel shows the expiry that the server returns (D-6). A refused start shows a clear error.
The control works at a narrow width with a target of 44 px or more for each option.

### FR-5 Strings

Each new visible string exists in `th` and in `en` under `ClassLogin`, and the message files of the
other locales (`cn`, `tw`, `vi`) fall back as they do today. The plan lists every new key
(task 1.9). The Thai labels go through the PM for Daniel's Thai check.

### FR-6 Tests

Tests prove: the three choices (the `expiresAt` of each), a refused value, `'until_17'` at 17:00 and
later Bangkok time with a fixed clock, the audit line holds the choice, and a card and a class code still
fail after expiry. Handler tests and panel tests cover the choice control.

## 6. Constraints

- No database migration. No new column. No new table.
- The picture password logic, the rate limits (`packages/domain/src/student-login/rate-limits.ts`), and the
  card token logic do not change. The only lifetime source is the session row.
- No new hash, checksum, or manifest (`AGENTS.md`, Hashing and Provenance Policy).
- The client never computes the expiry. It sends only the enum value.
- No push and no deploy. The orchestrator and Daniel keep the deploy gate.
- Heavy commands run through `heavy-run.sh` with `HEAVY_PRIORITY=p2 HEAVY_RUN_TIMEOUT_S=1800`.
  Each named-file Vitest command carries `--maxWorkers=1`.
- The Primary app has pre-existing ESLint errors. Lint only the changed files.
- Storytime keeps the first claim on the heavy lock. This track is one light role at a time.

## 7. Acceptance criteria

- **AC-1 (three choices).** For a fixed `now`, `startClassSession` returns `expiresAt` equal to
  `now + 3 h` for `'3h'` and for no value, `now + 7 d` for `'7d'`, and 17:00 Asia/Bangkok of the same
  Bangkok date for `'until_17'`.
- **AC-2 (refused values).** The contract refuses `'1d'`, `'30d'`, `''`, a number, and `null`.
  The handler returns 400 for each. A direct domain call with an unknown value, cast around the type, does not insert a row.
- **AC-3 (until 17:00 limit).** With the clock at 16:59:59 Bangkok the choice works. At 17:00:00 and at
  23:59 Bangkok the call throws `invalid_input`, inserts no row, closes no old session, and writes no audit
  line. The test covers a UTC date that differs from the Bangkok date (for example 2026-11-11T17:30:00Z is
  2026-11-12 00:30 Bangkok).
- **AC-4 (audit).** The `class_start` audit metadata holds `lifetime` equal to the chosen value, with `sessionId`
  and `expiresAt` unchanged.
- **AC-5 (expiry still fails).** After the `expiresAt` of each choice, the card sign-in and the class code
  lookup both fail. Before it, both work. An early end still closes the session.
- **AC-6 (panel).** The panel renders three options in `en` and `th`, selects "3 hours" by default, posts
  the chosen value, hides "Until 17:00 today" at Bangkok 17:00 or later, and shows the server expiry.
- **AC-7 (other behavior stays).** The existing tests of `student-login-*` in the domain package and of the
  handler and panel files exit 0, except the one line that fixes the 3-hour value, which stays correct.
- **AC-8 (no migration).** `git diff --name-only <base>..HEAD -- packages/db` returns an empty list.
- **AC-9 (reviews).** Review B (security) passes. Review A and Review C apply. A browser check of the
  teacher panel in one viewport, in `th` and `en`, applies; the strategy role decides its scope.
- **AC-10 (strings out).** The list of new `th` and `en` strings with their keys is sent to the PM
  orchestrator (task 1.10).

## 8. Out of scope

- A free-text or custom duration. A choice above 7 days.
- A change of the picture password, the rate limits, the card token format, or the card rotation.
- A per-student or per-card lifetime. A separate card lifetime.
- A stored lifetime column or a migration.
- A change in the roster route or the student-facing pages.
- A deploy, a traffic move, or a push.

## 9. Review focus for Review B (security)

- The enum is the only input. The server computes the time. No client value reaches `expiresAt`.
- The 7-day session keeps the class code and every card of the class valid for 7 days. A lost card or a code that
  a student photographs works for that time. The teacher can end the session early.
- For a class with the picture password off, the class code alone gives a `code_only` session
  (`picture-password.ts:155`). With `'7d'`, that entry stays open for 7 days. See OQ-1.
- The refused `'until_17'` writes no row and no audit line and closes no old session.
- The audit line records the choice. It holds no code, no hash, and no token.
- The rate limits and the card miss limits apply for the whole 7 days.

## 10. Open questions

- **OQ-1 (code-only classes with 7 days). Default: no change.** For a class with the picture password off,
  the 7-day class code is a 7-day sign-in for any student of the class without a second factor. The PM request
  keeps the picture password and the rate limits as they are. Review B reads this point. A refusal of
  `'7d'` for such a class, or a note on the panel, needs a PM decision.
- **OQ-2 (client clock for hiding `'until_17'`). Default: the panel uses the browser clock in Asia/Bangkok.**
  The server stays the authority (D-2). A browser clock that differs from the server clock can show a choice that
  the server then refuses. The refusal shows a clear error (FR-4).
- **OQ-3 (display of the date for 7 days). Default: D-6.** The text adds the date when the end falls on a later
  Bangkok date. The exact format follows the existing `useIntlFormatter`.
