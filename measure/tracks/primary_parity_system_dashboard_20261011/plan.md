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

## Phase 1: Design [checkpoint: 03426762d]

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

## Phase 2: Contracts and domain queries [checkpoint: c8102ed1a]

- [x] Task: Contracts
    - [x] Red: `packages/domain/src/__tests__/primary-platform-overview.test.ts`: the output schema of FR-2 and FR-3; the pure quiet rule at its limit (last activity 6 days ago: active; 7 days ago: quiet; none: quiet; no students: "No students")
    - [x] Green: `packages/domain/src/primary-dashboards/platform-contracts.ts` and the pure rule in `platform-rules.ts`
    - Done 2026-10-12 (a7b3414cd). Red run: 1 file failed (modules missing); green: 9 tests.
- [x] Task: Variant block "Platform scope": shared counts grouped by school
    - [x] Red: `packages/domain/src/__tests__/primary-dashboards-activity.pglite.test.ts` (extend): the scope `{ kind: "platform" }` gives one result for each school; students without a school are counted apart; the counts of school A do not include rows of school B
    - [x] Red: `packages/domain/src/__tests__/licenses-usage.test.ts` (extend): the seat usage grouped by school; a school without a license gives "no license"
    - [x] Green: `packages/domain/src/primary-dashboards/activity.ts`, `contracts.ts` (scope type), and `packages/domain/src/licenses/usage.ts`
    - Done 2026-10-12 (ee464cb10). Red run: 2 files, 9 tests failed. New: `getPlatformSchoolActivity` (one query), `countTeachersBySchool`, `countStudentsWithoutSchool`, `getSeatUsageBySchool` (seats null = no license). Type `SchoolBoundScope` for the helpers of `school.ts`.
- [x] Task: `getPlatformOverview` (FR-2 to FR-6)
    - [x] Red: `primary-platform-overview.test.ts` (recording DB: the queries group by `users.school_id`; the count of queries does not grow with the count of schools) and `primary-platform-overview.pglite.test.ts` (three schools: one active, one quiet, one without students)
    - [x] Red: permission tests: ADMIN, TEACHER, and STUDENT get FORBIDDEN; SYSTEM passes
    - [x] Green: `packages/domain/src/primary-dashboards/platform.ts`, export from `primary-dashboards/index.ts`
    - Done 2026-10-12 (9c51c78bd, fix in the next commit). Red run: 2 files failed (module missing); green: 17 tests. Four grouped queries. Default used: strip "Seats used" counts only schools with an active license with seats (M1).
- [x] Task: Run `pnpm --filter @reading-advantage/domain test`, then tsc and ESLint for `packages/domain`; rebuild the domain `dist/`
    - Done: vitest 167 files passed, 1938 tests passed; tsc 0 errors; ESLint 0 errors on the changed files; `dist` rebuilt; app tsc 0 errors. Clone check: totals and 8 school rows equal Q-A, Q-B, Q-C (clone dropped); the page query time was 0.2 to 0.3 s.
- [x] Task: Measure - User Manual Verification 'Phase 2: Contracts and domain queries' (Protocol in workflow.md)
    - Manual verification: run `packages/domain` vitest on `primary-platform-overview*.test.ts`; run `reference-sql.sql` on a clone and compare the totals and rows. Look check pending (owner, async).

## Phase 3: UI [checkpoint: b98aa8aa4]

Done 2026-10-12 (4245a46f0 strings, ac20079a4 page and table). Red run: 3 files failed, 1 test failed (modules and keys missing); green: 3 files, 38 tests. The page is a server page; `PlatformTotalsPanel` and `SchoolsTable` use the next-intl hooks. Captures: `design/captures-phase3.md`.

- [x] Task: The page: totals strip and schools table
    - [x] Red: `app/[locale]/system/dashboard/__tests__/page.test.tsx`: the six totals with their labels; the "without a school" count only when more than 0; no "System Dashboard Description" text
    - [x] Red: `components/system/__tests__/schools-table.test.tsx`: the default order (quiet first, then name), search, sort on each column and the second tap, the row link `/admin/dashboard?school=<id>`, "No license" and "None" cells, the row card layout at a phone width
    - [x] Green: `app/[locale]/system/dashboard/page.tsx` (server page, `Scene`, `Panel`), `loading.tsx`, `error.tsx`, and `components/system/schools-table.tsx` (client component); server errors log with `lib/observability/logger.ts`
- [x] Task: Strings in en, th, cn, tw, vi
    - [x] Red: `components/system/__tests__/system-dashboard-messages.test.ts`: every `SystemDashboard` key of `messages/en.json` exists in th, cn, tw, and vi
    - [x] Green: `messages/{en,th,cn,tw,vi}.json`; remove the placeholder description key (FR-13)
- [x] Task: Run `pnpm --filter primary-advantage test`, then tsc and ESLint on the changed files
    - Done 2026-10-12: app vitest 266 of 267 files passed (1693 tests passed, 2 skipped); the one failed file `server/models/__tests__/userModel.activity.behavior.test.ts` timed out in `beforeAll` (PGlite start, 10 s, under load) and passed alone (2 tests); app tsc 0 errors; ESLint 0 errors on the changed files.
- [x] Task: Measure - User Manual Verification 'Phase 3: UI' (Protocol in workflow.md) — look check pending (owner, async)
    - Manual verification: open each PNG of `design/captures.md` (phase 1) and of `captures-phase3.md` (phase 3); compare the built page with the mock; check the quiet chip text, 4 values and one button for each card at 375 px, the 48 px sort control, the sort arrows at 1280 px, and the night captures.

## Phase 4: Acceptance [checkpoint: 538e750f5]

Prepared 2026-10-12. The kit run, the captures, and the owner look check wait for the batch (orchestrator).

- [x] Task: Run the queries one time against a clone of the rehearsal copy; compare each total and school row with the reference SQL; measure the page time (target 2 s)
    - Done in Phase 2 (totals and 8 rows equal, 0.2 to 0.3 s); Phase 3 did not change the domain call. Recorded in `acceptance.md`. The page time on a build: batch capture (orchestrator).
- [ ] Task: Side-by-side check with the kit of `primary_parity_acceptance_20261011`: AC-1 to AC-5, as SYSTEM and as a school ADMIN, legacy `bfea121` and the new build on copies with the same data
    - [x] Write `acceptance-pairs.json` (6 pairs; parses with `PairList`) and `acceptance-steps-open-school.ts` (env `PARITY_SCHOOL_ID`)
    - [ ] Run `scripts/primary-parity/capture.ts` for legacy and new, then `scripts/primary-parity/report.ts` — batch capture (orchestrator)
    - [x] Write `acceptance.md`
- [ ] Task: Captures at 375 px and 1280 px, day and night, with the demo seed only, and the owner's look check (AC-6) — batch capture (orchestrator)
- [x] Task: Run `measure/generate.sh`, then `measure/doctor.sh` (one failure, A13, outside this track; `measure/generated` restored)
- [x] Task: Final gates (AC-7): domain 1938 tests passed; app 1695 tests passed (5 load timeouts passed alone); tsc 0; ESLint 0. See `acceptance.md`.
- [x] Task: Measure - User Manual Verification 'Phase 4: Acceptance' (Protocol in workflow.md) — look check pending (owner, async)
    - Manual verification: read the report of the batch run; open `/system/dashboard` as SYSTEM and compare 3 rows with `reference-sql.sql`; tap a row and check the admin page; open the page as ADMIN and check the unauthorized page.

## Phase: Review Fixes 2026-10-13

- [x] Task: Low: FR-9 order, quiet first and then every other school by name only 001d16cff
- [x] Task: Low: the date "Oct 6" follows the locale (cn and tw map to zh-CN and zh-TW) fc0925c1e
- [x] Task: Low: the active column sorts on the count of active students (FR-9 "active students this week") 412a56854
- [x] Task: Low: a school with no students shows a dash in the seats cell, not "0 of 30" 412a56854
- [x] Task: Low: last activity reads one max for each user in each table; PGlite test equals the old query for two schools 001d16cff
- [x] Task: Default (record only): the strip seat total counts schools with an active license (no change)
- Note: no index on `(user_id, created_at)` was added (a migration). The query shape can use one. Recommend a migration if the production time is bad.
