# Plan review — primary_parity_teacher_home_20261011

## Phase 1: Design (phase start sha 9f9fbf9eb)

Phase review of the diff (docs, SQL, and notes only). No Critical and no High finding.

Medium:

- FR-4 says "70 % or more". `activeRate7d` is a whole percent. The contract decides that the status reads the rounded percent the row shows (69.6 % shows 70 % and gives `onTrack`). Phase 2 must write the rule test at the rounded limits and keep the contract.
- The current `getTeacherHome` counts class students with no role filter. The contract and `reference.sql` count only users with the role `STUDENT` in the teacher school (the shared scope rule). Phase 2 must add this filter to the student count too, so that the strip and the table agree.

Low:

- The phone card of one class is about 280 px high. Six classes need about 1700 px. Accepted for the first release. A compact card is a later change.
- The spec "Current Monorepo State" says "`studentCount`, `studentCount`". It means the class `studentCount` and the total. No change needed.
- The `Need help` tile has no link. The sub-line says "See the list below". An anchor link is optional in Phase 3.

Shortcuts and lessons (for the orchestrator to move into the shared files):

- Lesson: the design harness needs `i.decode()` on all images before a screenshot. With a fixed wait, two captures had a grey backdrop.
- Lesson: a `next-intl` stub that reads the real `messages/en.json` lets a harness render real client components with real strings.
