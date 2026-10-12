# Plan — Primary parity: teacher home numbers and class table

Track set member 4 of `primary_parity_20261011`. Depends on `primary_parity_acceptance_20261011`.
Template group "dashboards": the same four phases as `primary_parity_admin_dashboard_20261011`
and `primary_parity_system_dashboard_20261011`. Variant blocks of this member: "Class scope",
"CSV export", "Coordination with class books".

Shared queries: `primary_parity_admin_dashboard_20261011` builds
`packages/domain/src/primary-dashboards/`. This member extends `activity.ts` with the class
scope. If this member starts first, it builds the module (contracts, window, Bangkok day SQL,
the activity event rule) with the same file names and scope type, as the admin plan Phase 2
describes, and the admin member extends it. Do not write a second copy of a count.

TDD order for each code task (`measure/workflow.md`): write the failing test, run it and see it
fail, write the minimum code, run it and see it pass, then refactor and add JSDoc. Run tsc and
ESLint one time per phase, before the phase commit. One heavy job at a time on this machine.

## Phase 1: Design [checkpoint: 8aa5dce9f]

- [x] Task: Write the behavior contract from `docs/runbooks/primary-behavior-contract-template.md` (`primary_parity_acceptance_20261011` FR-11)
    - [x] List each legacy number and table column with its `file:line` (spec, Legacy Behavior) and the new number or column, or the reason it changed
    - [x] Write the reference SQL for FR-1 and FR-2 (the kit runs it on the rehearsal copy) — `reference.sql`; ran read-only on `primary_parity_20261011` (1 teacher, 6 classes, 160 students): it returns one `summary` row and one `class` row for each class
    - [x] File: `measure/tracks/primary_parity_teacher_home_20261011/behavior-contract.md`
- [x] Task: Design the teacher home in the RPG skin
    - [x] Pick the place from `lib/rpg/places.ts` (proposal: `guild-hall`, the home place) and the block order: summary strip (8 numbers), class table with search, sort, and CSV, class book slot, Class Quest, open assignments, who needs help — default used: `guild-hall`, this order; look check pending (owner, async)
    - [x] Mock the class table at 375 px (row cards, sort select) and 1280 px (table), day and night, with the demo seed; files under `measure/tracks/primary_parity_teacher_home_20261011/design/` — PNG files are outside the repository; `design/captures.md` lists the paths; decisions are in `spec.md` "Design Decisions (Phase 1)"
- [x] Task: Owner's look check of the design and of the values in the spec section "Values for the Owner's Look Check"; record the answers in `spec.md` — look check pending (owner, async). Defaults used: XP in 7 days with a working trend, engagement status, table replaces the class cards, limits 70 % / 40 % / 5 %, place `guild-hall`. The defaults are in `spec.md`.
- [x] Task: Measure - User Manual Verification 'Phase 1: Design' (Protocol in workflow.md) — look check pending (owner, async)
    - Manual steps: (1) Open the files in `design/captures.md`. (2) Check `home-day-1280` and `home-night-1280`: the strip shows 8 numbers, the table has 8 columns, nothing is cut. (3) Check `home-day-375`, `home-day-375-s1`: the strip is 2 columns, each class is a card with a full-width "Start class". (4) Check `sorted-students-day-*` and `search-*`: the arrow, the filter, and the no-match line. (5) Check `empty-day-*`: the empty state. (6) Say if you want a change to one of the defaults in `spec.md`.

### Phase 1 notes

- Reference SQL decisions that Phase 2 must keep are in `behavior-contract.md` section 4: a student is a distinct `STUDENT` of the school in the classes; the status reads the whole percent that the row shows; the 7-day window is today and the 6 days before.
- Harness: `<scratchpad>/teacher_home-p1/` (`page.tsx` has the table and strip markup that Phase 3 ports). It imports the real `ClassBookSlot` through a `next-intl` stub that reads `messages/en.json`.
- The class book slot is not changed by this track (class_books S5 owns it).

## Phase 2: Contracts and domain queries [checkpoint: c453b9c49]

- [x] Task: Contracts
    - [x] Red: `packages/domain/src/__tests__/primary-teacher-home.test.ts` (extend): the output parses with the new fields of FR-1 and FR-2; the trend rule (FR-3) and the status rule (FR-4) at their limits (69 % / 70 %, 39 % / 40 %, +5 % / +5.1 %, previous 0)
    - [x] Green: `packages/domain/src/primary-home/teacher-contracts.ts` (new fields, `teacherClassRowSchema`, `classTrendSchema`, `classStatusSchema`) and the pure rules in `packages/domain/src/primary-home/teacher-class-rules.ts`
- [x] Task: Variant block "Class scope": shared counts for a class scope
    - [x] Red: `packages/domain/src/__tests__/primary-dashboards-activity.pglite.test.ts` (extend): the scope `{ kind: "classes", schoolId, classIds }`; counts grouped by class; a student in two classes counts in each class and one time in the totals; school B and other teachers' classes ignored
    - [x] Green: `packages/domain/src/primary-dashboards/activity.ts` and `contracts.ts` (scope type)
- [x] Task: `getTeacherHome` numbers and class rows
    - [x] Red: `primary-teacher-home.test.ts` (recording DB: each new where clause has the class ids; `now` at 23:30 Bangkok counts "today" on the Bangkok day) and `primary-teacher-home.pglite.test.ts` (FR-1, FR-2, `completedToday` uses `completed_at`, not `updated_at`; "who needs help" sees a lesson step as activity, FR-5)
    - [x] Green: `packages/domain/src/primary-home/teacher-home.ts` calls the shared counts; the last activity of "who needs help" comes from the shared rule
- [x] Task: Variant block "CSV export": the CSV text
    - [x] Red: `packages/domain/src/__tests__/teacher-class-csv.test.ts` (header of FR-10; a comma, a quote, and a new line in a class name; the order of the rows is kept) and the current `toProgressCsv` tests stay green
    - [x] Green: `packages/domain/src/csv.ts` (the quote rule moved from `primary-books/progress.ts:235-238`), `packages/domain/src/primary-home/teacher-class-csv.ts` (`toTeacherClassCsv`, no DB import), a pure subpath export in `packages/domain/package.json` (pattern: `./calendar-day`)
- [x] Task: Run `pnpm --filter @reading-advantage/domain test`, then tsc and ESLint for `packages/domain`; rebuild the domain `dist/`
- [x] Task: Measure - User Manual Verification 'Phase 2: Contracts and domain queries' (Protocol in workflow.md)
    - Result: domain suite 161 files passed, 4 skipped (1879 tests passed, 17 skipped); tsc and ESLint 0 errors; domain `dist` rebuilt; app tsc 0 errors.
    - Manual steps: (1) Read `teacher-class-rules.ts`: trend and status limits. (2) Run `vitest run src/__tests__/primary-teacher-home.pglite.test.ts` in `packages/domain`: the numbers and rows of two teachers. (3) Open `reference.sql` and compare its rules with `teacher-home.ts`.

### Phase 2 notes

- Added `classes` to the scope union in `primary-dashboards/contracts.ts` (`classesScopeSchema`). New counts in `activity.ts`: `getClassStudentStats`, `getAverageLevel`, `countActiveStudentsByClass`, `sumXpEarnedByClass`, `getLastActivityByStudent`. The `platform` kind can join the union later.
- `TeacherHome` has the new fields `activeStudents30d`, `engagementRate30d`, `averageLevel`, `activeToday`, `completedToday`, and `classRows` (`teacherClassRowSchema`). `classes` stays.
- Phase 3 imports `toTeacherClassCsv` from `@reading-advantage/domain/teacher-class-csv` and the types from `@reading-advantage/domain/primary-home` (check the existing page import path).

## Phase 3: UI [checkpoint: 5bd8921b4]

- [x] Task: Variant block "Coordination with class books": merge integration into the branch, and keep the class book slot of `primary_parity_class_books_20261011` as that member leaves it
    - Done with merge 961d1b995 (class_books S5, already in integration). `ClassBookSlot` is unchanged; the page places it in `lg:col-span-2` after the class table.
- [x] Task: The page: summary strip and class table
    - [x] Red: `app/[locale]/teacher/dashboard/__tests__/page.test.tsx` (extend): the eight numbers with their labels; "n of m (p %)"; the label "Average level"; no student gives "—" for the average level; one class list only
    - [x] Red: `components/teacher/__tests__/teacher-class-table.test.tsx`: search, sort on each column and the second tap, the class link `/teacher/class-roster/<id>`, the "Start class" link, the row card layout at a phone width
    - [x] Green: `app/[locale]/teacher/dashboard/page.tsx` (`Scene`, `Panel`, the strip; remove the class card list, FR-12) and `components/teacher/teacher-class-table.tsx` (client component; the page passes the parsed rows); server errors log with `lib/observability/logger.ts`
- [x] Task: Variant block "CSV export": the download button
    - [x] Red: table test: the button builds the file name with the Bangkok date and passes the shown rows in the shown order to `toTeacherClassCsv`
    - [x] Green: `components/teacher/teacher-class-table.tsx` (Blob download)
- [x] Task: Strings in en, th, cn, tw, vi
    - [x] Red: `components/teacher/__tests__/teacher-home-messages.test.ts`: every new `TeacherHome` key of `messages/en.json` exists in th, cn, tw, and vi
    - [x] Green: `messages/{en,th,cn,tw,vi}.json`
- [x] Task: Run `pnpm --filter primary-advantage test`, then tsc and ESLint on the changed files
    - Result: app suite 247 files, 1485 tests passed (449 s, under the lock); app `tsc --noEmit` 0 errors; ESLint 0 errors on the 6 changed source and test files and the dashboard folder. No failure in the other helper's files.
- [x] Task: Measure - User Manual Verification 'Phase 3: UI' (Protocol in workflow.md) — look check pending (owner, async)
    - Captures: `~/Desktop/primary-parity-progress/captures/teacher_home/phase3-ui/` (26 PNG files: home-day, home-night with scroll steps `-s1` to `-s3`, sorted-students-day, search-day, search-none-day, empty-day; each at `-375` and `-1280`). Harness: `<scratchpad>/teacher_home-p3/` (real page, real components, real CSS; only the data modules are stubs).
    - Manual steps: (1) Open `/teacher/dashboard` as a TEACHER. (2) The summary shows 8 numbers; the active tile reads "n of m (p%)"; the label says "Average level". (3) Search for part of a class name: only matching classes stay; a name with no match shows one status line. (4) Tap "Students" in the table head (or use the select at 375 px): the order changes; tap again: the order reverses. (5) Tap "Download CSV": the file `teacher-classes-<Bangkok date>.csv` has the shown rows in the shown order. (6) Tap a class name: the class page opens. Tap "Start class": the class page opens at the sign-in panel. (7) Check day and night at 375 px and 1280 px. (8) Check the Thai strings (owner check pending).

### Phase 3 notes

- Defaults used (member questions): place `guild-hall` with `Scene contained`; block order as in `spec.md` "Design Decisions (Phase 1)"; first tap on a numeric column sorts the biggest value first (students, active, average level, XP), first tap on class, trend, and status sorts ascending. The phone sort control is a select plus a direction button.
- Thai, cn, tw, and vi strings are written by the helper: owner check pending.
- New files: `components/teacher/teacher-class-table.tsx` (client), `components/teacher/teacher-summary-strip.tsx`. `TeacherQuestCard` has a new `panel` prop (parchment panel and skin buttons); the class page keeps the old look.
- The open assignments and "Who needs help" blocks are `Panel`s now; their chips and empty states still come from `@reading-advantage/ui`.
- The keys `TeacherHome.classes.students` and `TeacherHome.classes.all` have no user now. They stay in the five files so that the key sets stay equal.

## Phase 4: Acceptance [checkpoint: 8afe09db2]

- [x] Task: Run the queries one time against a clone of the rehearsal copy (never the shared copy); compare each number with the reference SQL of the behavior contract (3 teachers, 0 differences; `getTeacherHome` 483 ms cold, 40 to 63 ms warm; `acceptance.md`)
- [ ] Task: Side-by-side check with the kit of `primary_parity_acceptance_20261011`: AC-1 to AC-6, as a TEACHER, legacy `bfea121` and the new build on copies with the same school data
    - [x] Write `measure/tracks/primary_parity_teacher_home_20261011/acceptance-pairs.json` (kit FR-7): one pair for each check, with the legacy path, the new path, the role, and the observable behavior (8 pairs; it parses with `PairList`)
    - [ ] (batch capture (orchestrator)) Run `scripts/primary-parity/capture.ts` for legacy and new, then `scripts/primary-parity/report.ts`; the captures and the report stay in the private folder (kit FR-10)
    - [x] Write `measure/tracks/primary_parity_teacher_home_20261011/acceptance.md` from the runbook template, with the result of each check (the CSV file check is a manual step: the kit cannot capture a download)
- [ ] Task: (batch capture (orchestrator); look check pending (owner, async)) Captures at 375 px and 1280 px, day and night, with the demo seed only (`design/` folder; captures with real names stay in the private folder), and the owner's look check (AC-7)
- [x] Task: Run `measure/generate.sh`, then `measure/doctor.sh`; fix each failure in a file of this track
- [x] Task: Final gates: `pnpm --filter @reading-advantage/domain test`, `pnpm --filter primary-advantage test`, tsc and ESLint (AC-8); record the commands and results in `acceptance.md`
- [x] Task: Measure - User Manual Verification 'Phase 4: Acceptance' (Protocol in workflow.md) (look check pending (owner, async))

Phase 4 notes (helper, 2026-10-12):

- Defaults used: none (no member question open).
- Domain check: `getTeacherHome` equals `reference.sql` for 3 teachers (summary and every class row). The clone got 38 `xp_logs` rows so that the 7-day windows, trend, and status are non-zero. The clone is dropped. A `postgres-js` connection to the clone worked (local password), so no `db.execute` shim was needed.
- Time: no finding above 1 s. The Phase 2 Medium finding (merge the windows) stays Low.
- CSV: the kit has no download capture. The check is a manual step in `acceptance.md`.
- Pair `th-start-class` holds a raw legacy class id of the teacher with 6 classes (the same id as the class books pairs). The kit TEACHER must own that class.
- Final gates: the domain suite had one load timeout (`mastery-persistence-public-api.test.ts`, passes alone). The app suite has one failure outside this track (`app-nav.test.tsx`, `schoollicense` item from the school management track, bd796b6d8). The orchestrator must fix it at the merge.
- `measure/doctor.sh` cannot run as a script (no execute bit, and it calls `pnpm`). The helper ran its four `tests/orchestrator_*.sh` checks by hand: `catalog` (A13, old) and `supervisor_invariants` (missing file, old) fail; `marker_vocabulary` fails on many old plans and on the `[ ]` batch tasks above (by the brief); `review_execution_truthfulness` passes. `architecture:check` was not run (it needs `pnpm`).
- Batch capture: set `PARITY_CLASS_SEARCH`. Manual verification after the batch: open the report of the 8 pairs; check the numbers against `acceptance.md`; do the CSV manual step.
