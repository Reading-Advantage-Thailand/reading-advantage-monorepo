# Plan — Primary parity: system dashboard with a schools table

Track set member 5 of `primary_parity_20261011`. Depends on `primary_parity_admin_dashboard_20261011`
(the shared module, the seat usage, and the SYSTEM school choice of `/admin/dashboard`).
Template group "dashboards": the same four phases as `primary_parity_admin_dashboard_20261011`
and `primary_parity_teacher_home_20261011`. Variant block of this member: "Platform scope".

Shared queries: `primary_parity_admin_dashboard_20261011` builds
`packages/domain/src/primary-dashboards/` and `packages/domain/src/licenses/usage.ts`. This
member extends them with counts grouped by school. Do not write a second copy of a count.

TDD order for each code task (`measure/workflow.md`): write the failing test, run it and see it
fail, write the minimum code, run it and see it pass, then refactor and add JSDoc. Run tsc and
ESLint one time per phase, before the phase commit. One heavy job at a time on this machine.

## Phase 1: Design

- [x] Task: Write the behavior contract from `docs/runbooks/primary-behavior-contract-template.md` (`primary_parity_acceptance_20261011` FR-11)
    - [x] List each legacy number, tab, and control with its `file:line` (spec, Legacy Behavior) and the new total or column, or the reason it is gone
    - [x] Write the reference SQL for FR-2 to FR-4 (the kit runs it on the rehearsal copy)
    - [x] File: `measure/tracks/primary_parity_system_dashboard_20261011/behavior-contract.md`
- [x] Task: Design the page in the RPG skin
    - [x] Pick the place from `lib/rpg/places.ts` (proposal: `observatory`, as the admin dashboard) and the layout: the totals strip, then the schools table with search; the quiet status as a sign with a text label, not a colour only
    - [x] Mock at 375 px (row cards) and 1280 px (table), day and night, with the demo seed and one quiet school; files under `measure/tracks/primary_parity_system_dashboard_20261011/design/`
    - Done 2026-10-12: place `observatory`; notes in `design/design.md`, capture list in `design/captures.md`, PNG files in `~/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/`. Reference SQL in `reference-sql.sql` (run on `primary_parity_20261011`: 8 schools, 3 quiet).
- [x] Task: Owner's look check of the design and of the values in the spec section "Values for the Owner's Look Check" (the quiet rule first); record the answers in `spec.md` — look check pending (owner, async)
    - Defaults used (member questions, no stop): quiet rule = at least one student and no event in 7 days; "this week" = last 7 days; "articles opened" = the reading number; order = quiet first, then name; students without a school shown as a note in the strip; strip "Seats used" counts only schools with an active license that has seats (design choice, new).
    - Manual verification: open each PNG of `design/captures.md`; check that the quiet chip reads "Quiet" with a mark; check that a card shows 4 values and one button at 375 px; check the night captures; answer or change each default above.
- [x] Task: Measure - User Manual Verification 'Phase 1: Design' (Protocol in workflow.md) — look check pending (owner, async)

## Phase 2: Contracts and domain queries

- [ ] Task: Contracts
    - [ ] Red: `packages/domain/src/__tests__/primary-platform-overview.test.ts`: the output schema of FR-2 and FR-3; the pure quiet rule at its limit (last activity 6 days ago: active; 7 days ago: quiet; none: quiet; no students: "No students")
    - [ ] Green: `packages/domain/src/primary-dashboards/platform-contracts.ts` and the pure rule in `platform-rules.ts`
- [ ] Task: Variant block "Platform scope": shared counts grouped by school
    - [ ] Red: `packages/domain/src/__tests__/primary-dashboards-activity.pglite.test.ts` (extend): the scope `{ kind: "platform" }` gives one result for each school; students without a school are counted apart; the counts of school A do not include rows of school B
    - [ ] Red: `packages/domain/src/__tests__/licenses-usage.test.ts` (extend): the seat usage grouped by school; a school without a license gives "no license"
    - [ ] Green: `packages/domain/src/primary-dashboards/activity.ts`, `contracts.ts` (scope type), and `packages/domain/src/licenses/usage.ts`
- [ ] Task: `getPlatformOverview` (FR-2 to FR-6)
    - [ ] Red: `primary-platform-overview.test.ts` (recording DB: the queries group by `users.school_id`; the count of queries does not grow with the count of schools) and `primary-platform-overview.pglite.test.ts` (three schools: one active, one quiet, one without students)
    - [ ] Red: permission tests: ADMIN, TEACHER, and STUDENT get FORBIDDEN; SYSTEM passes
    - [ ] Green: `packages/domain/src/primary-dashboards/platform.ts`, export from `primary-dashboards/index.ts`
- [ ] Task: Run `pnpm --filter @reading-advantage/domain test`, then tsc and ESLint for `packages/domain`; rebuild the domain `dist/`
- [ ] Task: Measure - User Manual Verification 'Phase 2: Contracts and domain queries' (Protocol in workflow.md)

## Phase 3: UI

- [ ] Task: The page: totals strip and schools table
    - [ ] Red: `app/[locale]/system/dashboard/__tests__/page.test.tsx`: the six totals with their labels; the "without a school" count only when more than 0; no "System Dashboard Description" text
    - [ ] Red: `components/system/__tests__/schools-table.test.tsx`: the default order (quiet first, then name), search, sort on each column and the second tap, the row link `/admin/dashboard?school=<id>`, "No license" and "None" cells, the row card layout at a phone width
    - [ ] Green: `app/[locale]/system/dashboard/page.tsx` (server page, `Scene`, `Panel`), `loading.tsx`, `error.tsx`, and `components/system/schools-table.tsx` (client component); server errors log with `lib/observability/logger.ts`
- [ ] Task: Strings in en, th, cn, tw, vi
    - [ ] Red: `components/system/__tests__/system-dashboard-messages.test.ts`: every `SystemDashboard` key of `messages/en.json` exists in th, cn, tw, and vi
    - [ ] Green: `messages/{en,th,cn,tw,vi}.json`; remove the placeholder description key (FR-13)
- [ ] Task: Run `pnpm --filter primary-advantage test`, then tsc and ESLint on the changed files
- [ ] Task: Measure - User Manual Verification 'Phase 3: UI' (Protocol in workflow.md)

## Phase 4: Acceptance

- [ ] Task: Run the queries one time against a clone of the rehearsal copy (never the shared copy); compare each total and school row with the reference SQL of the behavior contract; measure the page time (target 2 s)
- [ ] Task: Side-by-side check with the kit of `primary_parity_acceptance_20261011`: AC-1 to AC-5, as SYSTEM and as a school ADMIN, legacy `bfea121` and the new build on copies with the same data
    - [ ] Write `measure/tracks/primary_parity_system_dashboard_20261011/acceptance-pairs.json` (kit FR-7): one pair for each check, with the legacy path, the new path, the role, and the observable behavior
    - [ ] Run `scripts/primary-parity/capture.ts` for legacy and new, then `scripts/primary-parity/report.ts`; the captures and the report stay in the private folder (kit FR-10)
    - [ ] Write `measure/tracks/primary_parity_system_dashboard_20261011/acceptance.md` from the runbook template, with the result of each check
- [ ] Task: Captures at 375 px and 1280 px, day and night, with the demo seed only (`design/` folder; captures with real names stay in the private folder), and the owner's look check (AC-6)
- [ ] Task: Run `measure/generate.sh`, then `measure/doctor.sh`; fix each failure in a file of this track
- [ ] Task: Final gates: `pnpm --filter @reading-advantage/domain test`, `pnpm --filter primary-advantage test`, tsc and ESLint (AC-7); record the commands and results in `acceptance.md`
- [ ] Task: Measure - User Manual Verification 'Phase 4: Acceptance' (Protocol in workflow.md)
