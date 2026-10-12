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
