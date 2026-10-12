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

## Phase 2: Contracts and domain queries

- [ ] Task: Contracts
    - [ ] Red: `packages/domain/src/__tests__/primary-teacher-home.test.ts` (extend): the output parses with the new fields of FR-1 and FR-2; the trend rule (FR-3) and the status rule (FR-4) at their limits (69 % / 70 %, 39 % / 40 %, +5 % / +5.1 %, previous 0)
    - [ ] Green: `packages/domain/src/primary-home/teacher-contracts.ts` (new fields, `teacherClassRowSchema`, `classTrendSchema`, `classStatusSchema`) and the pure rules in `packages/domain/src/primary-home/teacher-class-rules.ts`
- [ ] Task: Variant block "Class scope": shared counts for a class scope
    - [ ] Red: `packages/domain/src/__tests__/primary-dashboards-activity.pglite.test.ts` (extend): the scope `{ kind: "classes", schoolId, classIds }`; counts grouped by class; a student in two classes counts in each class and one time in the totals; school B and other teachers' classes ignored
    - [ ] Green: `packages/domain/src/primary-dashboards/activity.ts` and `contracts.ts` (scope type)
- [ ] Task: `getTeacherHome` numbers and class rows
    - [ ] Red: `primary-teacher-home.test.ts` (recording DB: each new where clause has the class ids; `now` at 23:30 Bangkok counts "today" on the Bangkok day) and `primary-teacher-home.pglite.test.ts` (FR-1, FR-2, `completedToday` uses `completed_at`, not `updated_at`; "who needs help" sees a lesson step as activity, FR-5)
    - [ ] Green: `packages/domain/src/primary-home/teacher-home.ts` calls the shared counts; the last activity of "who needs help" comes from the shared rule
- [ ] Task: Variant block "CSV export": the CSV text
    - [ ] Red: `packages/domain/src/__tests__/teacher-class-csv.test.ts` (header of FR-10; a comma, a quote, and a new line in a class name; the order of the rows is kept) and the current `toProgressCsv` tests stay green
    - [ ] Green: `packages/domain/src/csv.ts` (the quote rule moved from `primary-books/progress.ts:235-238`), `packages/domain/src/primary-home/teacher-class-csv.ts` (`toTeacherClassCsv`, no DB import), a pure subpath export in `packages/domain/package.json` (pattern: `./calendar-day`)
- [ ] Task: Run `pnpm --filter @reading-advantage/domain test`, then tsc and ESLint for `packages/domain`; rebuild the domain `dist/`
- [ ] Task: Measure - User Manual Verification 'Phase 2: Contracts and domain queries' (Protocol in workflow.md)

## Phase 3: UI

- [ ] Task: Variant block "Coordination with class books": merge integration into the branch, and keep the class book slot of `primary_parity_class_books_20261011` as that member leaves it
- [ ] Task: The page: summary strip and class table
    - [ ] Red: `app/[locale]/teacher/dashboard/__tests__/page.test.tsx` (extend): the eight numbers with their labels; "n of m (p %)"; the label "Average level"; no student gives "—" for the average level; one class list only
    - [ ] Red: `components/teacher/__tests__/teacher-class-table.test.tsx`: search, sort on each column and the second tap, the class link `/teacher/class-roster/<id>`, the "Start class" link, the row card layout at a phone width
    - [ ] Green: `app/[locale]/teacher/dashboard/page.tsx` (`Scene`, `Panel`, the strip; remove the class card list, FR-12) and `components/teacher/teacher-class-table.tsx` (client component; the page passes the parsed rows); server errors log with `lib/observability/logger.ts`
- [ ] Task: Variant block "CSV export": the download button
    - [ ] Red: table test: the button builds the file name with the Bangkok date and passes the shown rows in the shown order to `toTeacherClassCsv`
    - [ ] Green: `components/teacher/teacher-class-table.tsx` (Blob download)
- [ ] Task: Strings in en, th, cn, tw, vi
    - [ ] Red: `components/teacher/__tests__/teacher-home-messages.test.ts`: every new `TeacherHome` key of `messages/en.json` exists in th, cn, tw, and vi
    - [ ] Green: `messages/{en,th,cn,tw,vi}.json`
- [ ] Task: Run `pnpm --filter primary-advantage test`, then tsc and ESLint on the changed files
- [ ] Task: Measure - User Manual Verification 'Phase 3: UI' (Protocol in workflow.md)

## Phase 4: Acceptance

- [ ] Task: Run the queries one time against a clone of the rehearsal copy (never the shared copy); compare each number with the reference SQL of the behavior contract
- [ ] Task: Side-by-side check with the kit of `primary_parity_acceptance_20261011`: AC-1 to AC-6, as a TEACHER, legacy `bfea121` and the new build on copies with the same school data
    - [ ] Write `measure/tracks/primary_parity_teacher_home_20261011/acceptance-pairs.json` (kit FR-7): one pair for each check, with the legacy path, the new path, the role, and the observable behavior
    - [ ] Run `scripts/primary-parity/capture.ts` for legacy and new, then `scripts/primary-parity/report.ts`; the captures and the report stay in the private folder (kit FR-10)
    - [ ] Write `measure/tracks/primary_parity_teacher_home_20261011/acceptance.md` from the runbook template, with the result of each check
- [ ] Task: Captures at 375 px and 1280 px, day and night, with the demo seed only (`design/` folder; captures with real names stay in the private folder), and the owner's look check (AC-7)
- [ ] Task: Run `measure/generate.sh`, then `measure/doctor.sh`; fix each failure in a file of this track
- [ ] Task: Final gates: `pnpm --filter @reading-advantage/domain test`, `pnpm --filter primary-advantage test`, tsc and ESLint (AC-8); record the commands and results in `acceptance.md`
- [ ] Task: Measure - User Manual Verification 'Phase 4: Acceptance' (Protocol in workflow.md)
