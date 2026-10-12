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
