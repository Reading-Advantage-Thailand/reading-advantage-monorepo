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
