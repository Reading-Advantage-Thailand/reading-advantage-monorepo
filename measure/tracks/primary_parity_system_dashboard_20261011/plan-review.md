# Plan review — primary_parity_system_dashboard_20261011

## Phase 1: Design (2026-10-12)

Scope: documents and design captures only. The phase diff has no code, so there is no security, test, JSDoc, or logger finding.
Locale key parity: no message key changed in this phase.

Critical and High findings: none.

Medium:

- M1. The strip "Seats used" counts only schools with an active license that has seats. Spec FR-2 says "seats used of
  seats for all schools". Phase 2 must follow the behavior contract (section 5), or the owner changes the default.
- M2. The "Quiet" rule uses the last activity event of all time (`last_ts < start of week`). Phase 2 must use the same
  shared event rule (`activityEventsSql`) so that the last activity and the active count agree.

Low:

- L1. The mock formats dates with `toLocaleDateString("en-GB")` ("18 Sept"). Phase 3 must use `format.dateTime` of next-intl in `Asia/Bangkok`.
- L2. The mock shows no sort control state for the phone (a static label). Phase 3 needs a real control (select or button group, 48 px).
- L3. The reference SQL repeats no CTE for each query (unlike the admin file). It is read only and runs in about one second on the copy.

Shortcuts, deviations, lessons (for the orchestrator to move into the shared files):

- Deviation: one new default, the strip "Seats used" rule (see M1).
- Lesson: the local matched copy has 3 quiet schools, so AC-3 needs no test school.
- Lesson: `psql -v as_of=` (empty value) works; the admin header line `-v as_of="''"` fails with this psql through `docker exec`.

## Phase 2: Contracts and domain queries (2026-10-12)

Scope: `git diff 35230d12f..HEAD` (domain package only). No UI, no message key, no app server code, so the logger rule and
locale key parity do not apply.
Plan compliance: all four tasks done. Permission: `assertCan(user, "system:dashboard:read")` first; ADMIN, TEACHER, and STUDENT get
FORBIDDEN before any query (tests). Every raw query opens through `unscoped("<reason>")`. Output is parsed with Zod. Every export has JSDoc.
Clone check: totals and all 8 school rows equal the reference SQL (Q-A, Q-B, Q-C) on a clone, as of 2026-10-12.

Critical and High findings: none. One test failure found and fixed in the phase (`tenant-coverage` needed the reason in `platform.ts`).

Medium:

- M1. Seats: the strip shows 5 of 101 on the copy. The 101 includes a 1-seat license of a school with no students
  ("Basic Website : Sale Page"). It follows the reference SQL, so Phase 3 shows it as is. The owner can change the rule at the look check.
- M2. Order: the domain order is quiet, active, no students (each by name), as in the reference SQL. Spec FR-9 says "quiet first,
  then name". Phase 3 must use the domain order as the default order and sort in the client for the other columns.
- M3. School names sort by the Postgres collation of the database; the client sort for "name" can differ for Thai names. Phase 3 uses `localeCompare`.

Low:

- L1. `teachers` total is the sum of the per-school map. A teacher with a school id not in `schools` is not possible (foreign key), so the sum equals Q-A.
- L2. `scopeStudentsSql` returns the extra column `school_id` for all scopes. Existing callers ignore it.
- L3. The admin dashboard and teacher home tests stay green (run in the full domain suite).

Shortcuts, deviations, lessons (for the orchestrator to move into the shared files):

- Lesson: the `tenant-coverage` test checks the text of each domain file; a file that only calls other helpers still needs `createTenantDB(...).unscoped("<reason>")`.
- Lesson: the PGlite test database holds a default school (`c0deca00-...`) with no students; tests that list all schools must filter.
- Lesson: a node script with the root `postgres` and `drizzle-orm` plus the domain `dist` runs a domain function on a clone in 0.3 s.

## Phase 3: UI (2026-10-12)

Scope: `git diff 05789395f..HEAD` (app page, two components, tests, five message files, and track notes).
Plan compliance: all tasks done. The page is a server page with no API route (FR-7). It calls `getPlatformOverview` (SYSTEM only in the domain; the proxy refuses other roles). A failure logs `system_dashboard_failed` with `logger.error` and rethrows. The placeholder text is gone (FR-13); no message key existed for it.
Security: no new query or route. The row link uses `encodeURIComponent` on the school id. The page parses nothing from the URL.
Tests: 38 tests in 3 files. Key parity and ICU placeholders are tested for the five locales. JSDoc on each export.
Behavior check of the captures: no horizontal overflow; the status is a mark and a word; the sort control is 48 px (class `min-h-12`, tested).

Critical and High findings: none.

Medium:

- M1. English dates print as "Oct 6" (next-intl `en`), not "6 Oct" as in the Phase 1 mock. This is a locale format, not a defect. The owner can ask for a day-first format.
- M2. The "Active students" column sorts on the percent, not on the count. The cell shows both. A sort on the count is a one-line change if the owner prefers it.
- M3. The Thai text is mine. Owner check pending.

Low:

- L1. The direction button on a phone is disabled while the default order is on (the default has no direction). It looks faded in the captures.
- L2. The strip note uses an ICU plural in `en`; the other locales have one form (`other`).
- L3. The week in the page header uses `Asia/Bangkok` days printed in UTC, as the admin dashboard does. A formatter time zone of `Asia/Bangkok` would give the same day for the key.
- L4. The seats cell for "no students" shows "0 of 30". It is true (seats used are students), but a school with no students and a license can look odd.

Shortcuts, deviations, lessons (for the orchestrator to move into the shared files):

- Lesson: an async server component cannot render inside `renderWithMessages`; a component that only needs next-intl can use the hooks and stay a server component, and the test then renders it.
- Lesson: the capture harness can bundle the real server page for a browser if `next-intl/server`, the session, the db, and the domain call are aliased to small stubs.
- Lesson: `flock` waits can take more than 10 minutes when three lanes run browser jobs; start the job in the background with `timeout`, and wait with `tail --pid`.
