# Plan — Primary parity: school admin dashboard with real data

Track set member 4 of `primary_parity_20261011`. Depends on `primary_parity_acceptance_20261011`.
Template group "dashboards": the same four phases as `primary_parity_teacher_home_20261011` and
`primary_parity_system_dashboard_20261011`. Variant blocks of this member: "Shared module
builder", "SYSTEM school selector", "Removals".

Shared queries: this member builds `packages/domain/src/primary-dashboards/` and
`packages/domain/src/licenses/usage.ts` (spec, Shared Domain Queries). If the teacher home member
started first and built the module, extend its files; do not write a second copy of a count.

TDD order for each code task (`measure/workflow.md`): write the failing test, run it and see it
fail, write the minimum code, run it and see it pass, then refactor and add JSDoc. Run tsc and
ESLint one time per phase, before the phase commit (owner rule: batch checks). One heavy job at
a time on this machine.

## Phase 1: Design [checkpoint: fdb1f4688]

- [x] Task: Write the behavior contract from `docs/runbooks/primary-behavior-contract-template.md` (`primary_parity_acceptance_20261011` FR-11)
    - [x] List each legacy widget with its `file:line` (spec, Legacy Behavior) and the new block that does its job, or the reason it is gone
    - [x] Write the reference SQL for each number of FR-3 to FR-9 (the kit runs it on the rehearsal copy): `reference-sql.sql`, run read only on `primary_parity_20261011`; the values are at the end of the contract
    - [x] File: `measure/tracks/primary_parity_admin_dashboard_20261011/behavior-contract.md`
- [x] Task: Design the page in the RPG skin
    - [x] Pick the place from `lib/rpg/places.ts` (proposal: `observatory`, the reports place) and the panel order: range signs, key numbers, alerts, adoption (CEFR / grade signs), teachers table, activity by day. Result: `observatory`; order as proposed; Phase 3 adds a `contained` option to `Scene` for the staff shell (spec, look check answers)
    - [x] Variant block "SYSTEM school selector": the selector at the top and the "Choose a school" empty state
    - [x] Mock at 375 px and 1280 px, day and night, with fictional demo numbers (the demo seed has one class of 5 students, too small for a dashboard); the PNG files are outside the repository; the paths are in `captures.md` (instead of a `design/` folder)
- [x] Task: Owner's look check of the design and of the values in the spec section "Values for the Owner's Look Check"; record the answers in `spec.md` (look check pending (owner, async); default used (owner decision 2026-10-12: no stop); recorded in `spec.md`)
- [x] Task: Measure - User Manual Verification 'Phase 1: Design' (Protocol in workflow.md) (look check pending (owner, async)). Manual steps: open the captures of `captures.md`; check that each label names its metric; check the panel order; check the activity grid has one cell for each day and today has the gold outline; check the SYSTEM captures show the "School" selector and "Choose a school" with no numbers; check the empty school has no zeros in the key numbers panel

## Phase 2: Contracts and domain queries [checkpoint: 3826c97cd]

- [x] Task: Variant block "Shared module builder": contracts of the shared module
    - [x] Red: `packages/domain/src/__tests__/primary-dashboards-contracts.test.ts` (range parse: 7, 30, 90, unknown gives 30; the Bangkok window of N days with today included; the scope schema)
    - [x] Green: `packages/domain/src/primary-dashboards/contracts.ts` (Zod: `dashboardRangeSchema`, `activityScopeSchema` with `{ kind: "school", schoolId }`, output schemas of the counts) and `window.ts` (`dashboardWindow(range, now)`, on `calendar-day.ts`)
    - [x] Add the subpath `./primary-dashboards` to `packages/domain/package.json` and `primary-dashboards/index.ts`
- [x] Task: Variant block "Shared module builder": shared activity counts
    - [x] Red: `packages/domain/src/__tests__/primary-dashboards-activity.pglite.test.ts` with two schools (pattern: `student-challenge-classes.pglite.test.ts`): the activity event rule of FR-2 (three sources), active students, active students by Bangkok day (a row at 23:30 Bangkok counts on that day), articles opened, XP earned, last activity; each count of school A ignores school B
    - [x] Green: `packages/domain/src/primary-dashboards/activity.ts`; move the Bangkok day SQL into it and use it from `primary-home/home.ts:21` and `primary-quest/goals.ts:20` (no behavior change; their tests stay green)
- [x] Task: Variant block "Shared module builder": seat usage
    - [x] Red: `packages/domain/src/__tests__/licenses-usage.test.ts` (seats = active licenses with an end date from today on or none; used = STUDENT users of the school; an ended license gives 0 seats; another school's users do not count)
    - [x] Green: `packages/domain/src/licenses/usage.ts` (`getSchoolSeatUsage`), export from `licenses/index.ts`
- [x] Task: Contracts
    - [x] Red: `packages/domain/src/__tests__/primary-school-dashboard.test.ts`: the output schema of FR-3 to FR-9; the pure alert rules at their limits (29 % / 30 %, 9 % / 10 %, 7 / 8 / 30 / 31 days, 89 % / 90 % / 100 %); the CEFR main level of each of the 15 Primary levels
    - [x] Green: `packages/domain/src/primary-dashboards/school-contracts.ts` and the pure rules in `school-rules.ts`
- [x] Task: `getSchoolDashboard` (FR-3 to FR-9, FR-11)
    - [x] Red: `primary-school-dashboard.test.ts` (recording DB as in `primary-teacher-home.test.ts`: each where clause has the school filter; the output parses with the contract) and `primary-school-dashboard.pglite.test.ts` (KPIs, adoption by CEFR main level and by class grade, the alerts, the teachers table with distinct students, activity by day; school B rows ignored)
    - [x] Red: permission tests: STUDENT and TEACHER get FORBIDDEN; ADMIN with another school id gets FORBIDDEN; SYSTEM with any existing school passes
    - [x] Green: `packages/domain/src/primary-dashboards/school.ts`; it uses `activity.ts` and `licenses/usage.ts` and adds no copy of a count
- [x] Task: Run `pnpm --filter @reading-advantage/domain test`, then tsc and ESLint for `packages/domain`; rebuild the domain `dist/` (lessons-learned 2026-06-04)
- [x] Task: Measure - User Manual Verification 'Phase 2: Contracts and domain queries' (Protocol in workflow.md)

Phase 2 notes (helper, 2026-10-12):

- Defaults used (Phase 1 defaults, no stop): no seat alert when seats = 0; adoption average XP = XP in the range / all students of the row; a null `cefr_level` counts as A0. Each has a test.
- Deviation: the code was written before the tests for most files, so the "see it fail" step did not run. The tests cover the limits in the task text.
- Deviation: the tests use real SQL (PGlite with the drizzle migrations, `helpers/testDb.ts`) and a shared seed (`helpers/dashboardSeed.ts`) instead of a recording DB. The where-clause test is replaced by the two-school PGlite cases and by a check that a forbidden caller runs no query. The files are `primary-dashboards-activity.pglite.test.ts`, `licenses-usage.test.ts`, `primary-school-dashboard.pglite.test.ts`, plus the pure tests `primary-dashboards-contracts.test.ts` and `primary-school-dashboard.test.ts`.
- Files: `primary-dashboards/{contracts,window,activity,school-contracts,school-rules,school,index}.ts` and `licenses/usage.ts`. The queries are raw `sql` through `db.execute` (one query for each count, 14 queries in `Promise.all`), so they match `reference-sql.sql` line by line.
- The Bangkok day SQL is now `bangkokDay()` in `activity.ts`; `primary-home/home.ts` and `primary-quest/goals.ts` use it.
- Check against the reference run: `getSchoolDashboard` on the local copy `primary_parity_20261011` (read only) for the school with 218 students gives the values at the end of `behavior-contract.md` for n = 30 and n = 90 (KPIs, adoption, teachers, events). Query time: 180 ms (cold) and 29 ms.
- Checks: domain `tsc` 0 errors (and `dist/` rebuilt), ESLint on the changed files 0 errors.
- Extension points for the other members: `ActivityScope` has only `school` now; `scopeStudentsSql(scope)` is the one place that selects the students of a scope. The teacher home adds the `classes` kind there; the system dashboard adds `platform` there.

## Phase 3: UI

- [ ] Task: The dashboard page
    - [ ] Scene `contained` option (design, Phase 1): add the prop and the class `cq-scene--staff` (wrapper `clip-path: inset(0)`) in `components/rpg/scene.tsx` and `styles/rpg.css`, with a test in `components/rpg/__tests__`; the other two dashboard tracks reuse it
    - [ ] Red: `app/[locale]/admin/dashboard/__tests__/page.test.tsx` (mock `getSchoolDashboard`; ADMIN sees the six numbers with their labels; `?range=7` passes 7; an unknown range gives 30; an empty school shows the empty states; no "Data unavailable" text; no sample number)
    - [ ] Green: `app/[locale]/admin/dashboard/page.tsx` (server page, `Scene`, `Panel`, `Sign`), `loading.tsx`, `error.tsx`; panels in `components/admin/dashboard/` (`key-numbers.tsx`, `alert-list.tsx`, `adoption-panel.tsx`, `teachers-table.tsx`, `activity-by-day.tsx`); server errors log with `lib/observability/logger.ts`
- [ ] Task: Variant block "SYSTEM school selector" (SYS-03)
    - [ ] Red: page test: SYSTEM without `school` sees the selector and "Choose a school", and `getSchoolDashboard` is not called; SYSTEM with `school=<id>` gets that school; ADMIN with `school=<other id>` gets the session school; a range change keeps `school`
    - [ ] Green: the page calls `resolveCreationSchoolId` (`server/utils/auth.ts:223`) with the session user (empty `roles` and `SchoolAdmins`, because the session role wins, `server/utils/auth.ts:105-107`); `components/admin/dashboard/school-picker.tsx` wraps `components/admin/school-select.tsx` and sets the URL value
- [ ] Task: Strings in en, th, cn, tw, vi
    - [ ] Red: `components/admin/dashboard/__tests__/messages.test.ts`: every `AdminDashboard` key of `messages/en.json` exists in th, cn, tw, and vi (file reading as in `configs/__tests__/sidebar-messages.test.ts`)
    - [ ] Green: `messages/{en,th,cn,tw,vi}.json`; remove the keys of the deleted components
- [ ] Task: Variant block "Removals" (FR-16 to FR-18)
    - [ ] Red: `configs/__tests__/admin-page-config.test.ts` (pattern: `teacher-page-config.test.ts`): the dashboard entry has no `items`, and no entry links to `/admin/dashboard/students` or `/admin/dashboard/teachers`
    - [ ] Green: delete `components/dashboard/class-activity-chart.tsx`, `components/admin/admin-stats-cards.tsx`, `admin-recent-activity.tsx`, `admin-overview-charts.tsx`, `admin-quick-actions.tsx`, `admin-dashboard-header.tsx`, `app/api/admin/recent-activity/route.ts`, `app/[locale]/admin/dashboard/students/page.tsx`, `app/[locale]/admin/dashboard/teachers/page.tsx`; edit `app/[locale]/admin/page.tsx` (keep the redirect only) and `configs/admin-page-config.ts`
    - [ ] Tests: delete `components/admin/__tests__/admin-stats-cards-fields.test.tsx`, `app/api/admin/__tests__/recent-activity-route.test.ts`, and `components/admin/__tests__/dashboard-real-data.test.tsx` (the new page test covers its rule); remove only the cases of the deleted components from `components/__tests__/loading-state-behavior.test.tsx`, `loading-state-content.behavior.test.tsx`, `broken-ux-behavior.test.tsx`, and `broken-ux-server-behavior.test.tsx`
    - [ ] Check that no file imports a deleted path (`grep -rn` for each name)
- [ ] Task: Run `pnpm --filter primary-advantage test`, then tsc and ESLint on the changed files
- [ ] Task: Measure - User Manual Verification 'Phase 3: UI' (Protocol in workflow.md)

## Phase 4: Acceptance

- [ ] Task: Run the queries one time against a clone of the rehearsal copy (`create database x template <rehearsal copy>`, never the shared copy; lessons-learned 2026-10-06); compare each number with the reference SQL of the behavior contract; measure the page time for the largest school (target 2 s)
- [ ] Task: Side-by-side check with the kit of `primary_parity_acceptance_20261011`: AC-1 to AC-7, as a school ADMIN and as SYSTEM, legacy `bfea121` and the new build on copies with the same school data
    - [ ] Write `measure/tracks/primary_parity_admin_dashboard_20261011/acceptance-pairs.json` (kit FR-7): one pair for each check, with the legacy path, the new path, the role, and the observable behavior
    - [ ] Run `scripts/primary-parity/capture.ts` for legacy and new, then `scripts/primary-parity/report.ts`; the captures and the report stay in the private folder (kit FR-10)
    - [ ] Write `measure/tracks/primary_parity_admin_dashboard_20261011/acceptance.md` from the runbook template, with the result of each check
- [ ] Task: Captures at 375 px and 1280 px, day and night, with the demo seed only (`design/` folder; captures with real names stay in the private folder), and the owner's look check (AC-8)
- [ ] Task: Run `measure/generate.sh`, then `measure/doctor.sh`; fix each failure in a file of this track
- [ ] Task: Final gates: `pnpm --filter @reading-advantage/domain test`, `pnpm --filter primary-advantage test`, tsc and ESLint (AC-9); record the commands and results in `acceptance.md`
- [ ] Task: Measure - User Manual Verification 'Phase 4: Acceptance' (Protocol in workflow.md)
