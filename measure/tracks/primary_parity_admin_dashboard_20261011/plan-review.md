# Plan review — primary_parity_admin_dashboard_20261011

## Phase 1: Design (phase start bfcfa0a15)

The phase changes documents only (no code, no strings, no schema). No Critical or High finding.

Medium:

- The local matched copy has no `audit_events` rows and no `primary_class_login_sessions` rows, and the two
  large schools have no license. Q3b (active teachers), Q6a (seats), and the license alerts return empty
  values on it. Phase 4 must create these rows on a clone (a teacher sign-in, one active license) before AC-2.
- Seats = 0 (no active license) gives no seat alert. The spec does not say this. The default is in the
  contract (section 5) and in the spec. Phase 2 needs a test for it (seats 0, 218 students: no alert).
- CEFR main level of a null `cefr_level` is "A0" (legacy default was "A0-"). Phase 2 must test this.

Low:

- The `Scene` `contained` option was tested only in a stand-in staff shell. Phase 3 must check it in the real
  admin layout (sticky header, bottom bar) with the real browser capture.
- The URL value `by=cefr|grade` is new (the spec names `range` and `school` only). It is in the spec look check notes.
- The design uses a native-looking select in the mock. The real selector is `components/admin/school-select.tsx`
  (shadcn `Select`); its trigger needs a skin look inside a parchment panel. Check it in Phase 3.
- Fixture numbers are fictional. The reference run values (end of the contract) come from an aggregate query
  on real data, with no school name.

Lessons (for the orchestrator to move into `measure/lessons-learned.md`):

- Helpers of two lanes share one scratchpad folder. A shared folder name (`h`) was overwritten by another lane.
  Use a folder with a unique name for harness scripts.
- Host `psql` is missing. Use `docker exec -i reading-advantage-postgres psql -U postgres -d <db> -v name=value < file.sql`.
- `audit_events.created_at` is `timestamptz`; the other activity tables store UTC `timestamp`. The window in the
  reference SQL has both forms (`t0z` and `t0`).

## Phase 2: Contracts and domain queries (phase start c2f3555c4)

I reviewed the phase diff. No Critical or High finding. All SQL values are bound parameters; `sql.raw` holds only the constant time zone name.

Medium:

- Most code was written before its test. The "see it fail" step did not run for these files.
- `getSchoolDashboard` does not check that a SYSTEM school id exists. A missing school gives empty data. The page does the check with `resolveCreationSchoolId` (Phase 3).
- The dashboard runs 14 aggregate queries in parallel. Each one scans the three event tables again. The local check gave 180 ms (cold) for the largest school. If the 2 s target fails on the rehearsal copy, record a tech-debt row.
- When the range is not 30, one extra query runs for the low activity alert (30-day window).

Low:

- The peak day of ties is the earliest day.
- The `by-day` average is rounded to 1 decimal place; the UI must format it.
- A level outside A0 to B2 (for example C1) gets its own adoption row, after B2.
- The tests use `session_replication_role = replica` to skip foreign keys in the seed.

Shortcut: queries are raw `sql` through `db.execute`, not the Drizzle builder, to match `reference-sql.sql`. A column rename breaks them at run time; the PGlite tests (real migrations) catch that.

Lesson: `tenant-coverage.test.ts` looks for the text `createTenantDB` or `unscoped` in each file with DB access. A shared helper in another file does not satisfy it for the calling file.

## Phase 3: UI (phase start d5222b7ac)

I reviewed the phase diff. No Critical or High finding. The page calls `resolveCreationSchoolId` (no copy), a forbidden or failed load is logged with the logger and goes to the error boundary, each panel parses data that passed the output schema, and the five locale files have the same keys (a test checks it, with the ICU placeholders).

Medium:

- `docs/primary-whats-moved.md:80` still describes the old page ("Data unavailable" cards, sample charts). The orchestrator regenerates or edits it at the closeout.
- The page test mocks `getSchoolDashboard` and the school picker. The real wiring (client `SchoolSelect` fetching `/api/schools`) has no browser test in this phase; Phase 4 covers it in the side-by-side check.
- Numbers use `toLocaleString("en-US")`, so Thai, Chinese, and Vietnamese users see western digits with a comma. This matches the other staff pages today.

Low:

- An ADMIN without a school id sees "Choose a school" and no selector.
- `loading.tsx` has no `Scene`; the skeleton shows on plain background.
- The `th`, `cn`, `tw`, and `vi` strings are first drafts by the helper. A native check is open.
- The teacher table keeps the name on one line (`whitespace-nowrap`); a very long name widens the table on a 375 px screen.

Shortcut: the "has a page" cases in `admin-page-config.test.ts` read the file system, as the teacher nav test does.

Lessons:

- `vi.mock("@reading-advantage/db")` without `importActual` fails when the page imports the domain barrel (the barrel needs table exports). Use `importActual` and override only `db`.
- A harness that bundles the real async page function (with stubs for the session and domain call) tests the real page markup for the captures; it is better than a copy of the markup.


## Phase 4: Acceptance (phase start 0c9356701)

I reviewed the phase diff (a test mock fix, two doc rows, the pair list, two steps modules, the contract table, notes). No Critical or High finding. No new server code, so no new TenantDB, `assertCan`, Zod, or logger point. The five locale files did not change.

Medium:

- The page captures, the page time on a build, and AC-8 are open (batch capture, orchestrator). The pair list needs `PARITY_SCHOOL_ID` and `PARITY_OTHER_SCHOOL_ID`, and the clone needs a teacher sign-in event and an active license for school B (see `acceptance.md`).
- The domain check used `psql` in the container for each query. The wall time is not the page time.
- "License ended" and "seats nearly full" have no row in the copy. Only the Phase 2 pure tests cover them.
- `orchestrator_marker_vocabulary` flags the `[ ]` capture tasks of this plan. The brief asks for `[ ]`.

Low:

- Steps modules read the school ids from the environment, so no id is in the repository.

Lessons (for the orchestrator):

- Run the full suite of the package at the end of the phase that adds a shared module. The `licenses.test.ts` mock of `drizzle-orm` broke when `licenses/usage.ts` used `sql` at load time. Phase 2 ran only its own tests.
- `eslint` needs the package folder (each package has its own `eslint.config.mjs`). Run it from `apps/primary-advantage` or `packages/domain`.
- A helper has no database password. A script can send raw SQL to `psql` in the container through a small `db.execute` shim.
