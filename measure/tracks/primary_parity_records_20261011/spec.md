# Spec — Correct the parity records of the stopped cutover

Track ID: `primary_parity_records_20261011`
Type: chore (Classic FR list)
Triage rows: every row that `docs/primary-whats-moved.md` marks wrong (Table A), and the follow-up
decision on M4.

## Overview

The Primary cutover of 2026-10-11 stopped after step C10. Step C11 (the traffic switch) did not run.
The legacy revision `primary-advantage-app-00125-9wd` keeps 100% of the traffic. The owner's check
found pages that are empty or reduced: the system dashboard, the student pages for staff, and the
class book.

Some records still say that the new build does the legacy jobs. `docs/primary-whats-moved.md` marks
empty and reduced pages as "same", "merged", or "removed" with no owner decision. A section of the
cutover record says that the placeholder "does not indicate a migration failure". The games removal
track keeps M4 after the cutover, but the owner moved it before the cutover.

This track corrects these records with content evidence, so the other members, the manual writers,
and the next cutover start from the facts. It also adds the behavior-evidence rule to the program
file and to the lessons learned. It changes documentation only: no code, no schema, no ETL, and no
runbook command.

## Track Set

This track is member 1 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: none. The shared decisions and the start gate in the set overview apply to this track.

## Verified Facts (2026-10-11, integration `ca8869cea`, legacy `bfea121`)

- E-1. The import commit `a56281cd4` (2026-05-01) copied legacy `1e1cc34` (2025-12-04). Of the 480
  files that it added under `apps/primary-advantage/`, 471 have the same blob as `1e1cc34`, 2 differ
  (`next.config.ts`, `package.json`), and 7 are new. From `1e1cc34` to `bfea121` (2026-08-10) legacy
  has 122 commits that are not merges (210 with the merges). None of them is in the monorepo.
  Commands: `git show --name-only --diff-filter=A a56281cd4`, then `git rev-parse` of each blob in both
  repositories; `git -C ~/Desktop/primary-advantage rev-list --count --no-merges 1e1cc34..bfea121`.
- E-2. `docs/primary-whats-moved.md:8` defines "same" as "the route and the job stay". No row compares
  page content or behavior. The header (line 6) names the branch `primary/lane-f-reedy-preview`, not
  the cutover build.
- E-3. In the integration worktree, `cutover-result-20261011.md:66-73` (track
  `primary_legacy_data_migration_20261004`) has an uncommitted section "Owner login and existing
  limitation". Another session wrote it. Its line 71 says: "This limitation predates the cutover and
  does not indicate a migration failure." The data steps C4 to C10 passed their checks, but the build
  did not pass the owner's check, and the cutover stopped. The section does not say that.
- E-4. `cutover-result-20261011.md:3` still says "Status: in progress." The migration track
  `plan.md:39` still says `[~] Run into the cutover target (2026-10-11)`.
- E-5. `measure/tracks/legacy_games_removal_20261006/spec.md:32-33` and `plan.md:48-50` put M4 after
  the cutover. `docs/primary-games-integration.md:88-90` says the legacy host stays "until M4 (after
  the cutover)". The owner follow-up decision of 2026-10-11 (`old_game_host_M4` in
  `~/Desktop/primary-parity-triage/followup-decisions-20261011.json`) removes the old host before the
  cutover, after a copy of the ElvGames assets to `~/Desktop/Asset Packs`. The set overview gives M4
  to `primary_parity_cleanup_20261011`.
- E-6. `measure/lessons-learned.md` has 57 lines. Its header (line 3) sets a limit of 50 lines. Two
  tests assert the limit and fail today: `packages/ai/src/__tests__/phase-10-closeout.test.ts:189`
  and `apps/science-advantage/lib/__tests__/housekeeping-phase12-closeout.test.ts:146`. Other tests
  need a kept entry, by its tag or by its words (table below). Phase 2 of the plan checks this list
  again with a full search. The entry format is `- (YYYY-MM-DD, <track_id>) <lesson>` under a `##`
  heading.

  | Test | It needs |
  |---|---|
  | `packages/auth/src/__tests__/phase-7-closeout.test.ts` | an entry `(2026-06-06, audit_log_retention_dsar_20260605)` |
  | `packages/webhooks/src/__tests__/phase-7-closeout.test.ts` | an entry `(2026-06-12, codecamp_review_ai_consolidation_20260605)` |
  | `packages/ai/src/__tests__/phase-10-closeout.test.ts` | the `ai_adapter_package` entry with the API-key gate words |
  | `packages/db/src/__tests__/deploy-gate-contract.test.ts:470-490` | the words "drizzle … migrator", "strict-<", and `1779120000000` |
  | `apps/science-advantage/lib/ci-gates/phase-14-closeout.test.ts:400-418` | the words `` `ignoreBuildErrors: true` ``, "type-safety hole", and "6 root cause" |
  | `apps/science-advantage/lib/observability/__tests__/phase-10-closeout.test.ts` | the `observability_stack_20260603` entry |
  | `apps/science-advantage/lib/__tests__/housekeeping-phase12-closeout.test.ts` | the `housekeeping_batch_20260603` entry |

- E-7. The owner's decisions are outside the repository, in `~/Desktop/primary-parity-triage/`:
  `triage-decisions-20261011-214840.json` (saved `2026-10-11T21:48:40+08:00`; the same content as
  `triage-decisions-latest.json`), `followup-decisions-20261011.json`, and `triage-form.html` (the
  form with the evidence of each row). The JSON files have no secrets. They have the owner's free-text
  notes (internal remarks). The repository is public.
- E-8. The ETL cites `docs/primary-whats-moved.md` as its reason to skip stories
  (`packages/db/src/migrations-data/primary-legacy-import.ts:79`). This track changes the doc, not the
  ETL. `primary_parity_stories_20261011` changes the ETL.

## Functional Requirements

- FR-1. **Mark definitions.** In `docs/primary-whats-moved.md`, change line 6 to the cutover build
  (`primary-parity-integration` at the commit of this change). Change line 8: "same" means that the
  page content and behavior match legacy `bfea121`. Add the marks "reduced" (the page exists, and a
  legacy job is missing or broken) and "missing" (no page does the legacy job). Add the
  behavior-evidence rule of FR-5 under the marks.
- FR-2. **Corrected rows.** Correct each row of Table A. Each corrected row has the new mark, one
  line of content evidence (`file:line` in the new app or in legacy `bfea121`), the triage row IDs,
  and the member that owns the fix (or "after the cutover"). Each "removed" mark names the owner
  decision and its date. Each corrected row gives the legacy page, the new page, and the account role,
  so the side-by-side kit (`primary_parity_acceptance_20261011`) can check the mark.
- FR-3. **Cutover record.** In `cutover-result-20261011.md`, replace the section "Owner login and
  existing limitation" and its claim of E-3 with a section "Result: stopped after C10". The section
  gives these facts:
  1. The owner signed in to the system account on a computer and on a phone, and the check passed.
  2. The owner then found gaps: the system dashboard shows only a heading and a placeholder text
     (`app/[locale]/system/dashboard/page.tsx:7`); staff cannot open the student pages; a teacher
     cannot assign the class book.
  3. The cutover stopped after C10. C11 to C14 did not run. The legacy revision
     `primary-advantage-app-00125-9wd` keeps 100% of the traffic (read-only check in this track).
  4. The cause: the import `a56281cd4` matches legacy `1e1cc34` (471 of 480 files); the 122 later
     legacy commits are missing (E-1); the earlier map compared route names, not page content.
  5. The state that stays: `primary_v2` holds the ETL of the C4 backup and the 21 temporary
     passwords; revision `primary-advantage-app-00130-daq` keeps the tag `cutover` with no traffic;
     `master` holds the merge `0a29d574e`, and the www deploy of run `38138912943` is live; the legacy
     build trigger stays off and the five scheduler jobs stay paused (shared decisions Q-04 and Q-05).
  6. The triage and the next steps: the files of E-7, the set overview, and rehearsal 3
     (`primary_parity_rehearsal3_20261011`).
  Change line 3 to "Status: stopped after C10 (2026-10-11)". Mark the items of "Remaining checks"
  that did not run.
- FR-4. **Migration track status.** In `primary_legacy_data_migration_20261004/plan.md:39`, change
  `[~]` to `[b]` with the reason (stopped after C10; the build lacks legacy behavior) and a link to
  the set overview. Add one status line at the top of `cutover-commands-20261011.md`: the sheet ran on
  2026-10-11, stopped after C10, and the command sheet of `primary_parity_rehearsal3_20261011`
  replaces it. Update `metadata.json` (`updated_at`, one sentence in `deviation_notes`).
- FR-5. **Behavior-evidence rule.** Add this rule to `measure/primary-tutor-parity-program.md`
  ("Rules for every lane", rule 10): "Compare page content and behavior with legacy HEAD (`bfea121`).
  A route name is not evidence. Every removal needs a recorded owner decision." Add one dated status
  line that links the set overview. Add one entry to `measure/lessons-learned.md` (section "Planning
  Improvements", format of E-6, tag `primary_parity_records_20261011`).
- FR-6. **Lessons-learned limit.** Before the new entry, condense `measure/lessons-learned.md` so that
  the file, with the new entry, has 50 lines or less. Keep every entry that a test of E-6 needs. Merge
  or shorten old entries; do not change the meaning of a kept entry.
- FR-7. **M4 move.** In `legacy_games_removal_20261006/spec.md`, change M4 to: moved to
  `primary_parity_cleanup_20261011` by the owner follow-up decision of 2026-10-11, before the cutover,
  after the copy of the ElvGames assets (with the slicing work) to `~/Desktop/Asset Packs`. In
  `plan.md`, change Phase 3 to "M3 (after the cutover)", keep the M3 task, and replace the M4 task with
  one line that names the new owner. In `docs/primary-games-integration.md:88-90`, change "until M4
  (after the cutover)" to "until M4 (`primary_parity_cleanup_20261011`, before the cutover)". Update
  the M4 note of the games removal entry in `measure/tracks.md`.
- FR-8. **Triage record.** Write `measure/tracks/primary_parity_records_20261011/triage-decisions.md`:
  the location of the files of E-7 (path, file name, and the `_saved_at` value), and one table row for
  each triage row: ID, area, feature (short), status, the owner's choice, the timing, and the member
  that owns it ("keep", "drop", or "after the cutover" for the others). A follow-up decision replaces
  the first choice, and the row says so (STU-09, STU-21, ADM-11, SYS-04, TCH-07, STU-14). The record
  does not copy the JSON and does not copy the free-text notes (FR-8 decision below).

**FR-8 decision: no copy of the JSON in the repository.** The JSON stays in
`~/Desktop/primary-parity-triage/` as the one source. Reasons: (1) the repository is public, and the
notes are internal remarks of the owner; (2) a second copy can drift from the source; (3) the hashing
policy of `AGENTS.md` forbids a checksum for provenance, so the record names the file and its
`_saved_at` value. The public repository still needs the decision values, because the rule of FR-5
needs a recorded owner decision for each removal. The table of FR-8 gives these values without the
notes. Each member spec restates a note only where it sets the scope.

### Table A: rows of `docs/primary-whats-moved.md` to correct

Lines are the lines of the doc at `ca8869cea`. Evidence paths are in `apps/primary-advantage/` unless
they start with "legacy". Each row was checked in the code on 2026-10-11.

| Line | Page (legacy → new) | Role | Mark now → new | Evidence | Rows | Owner of the fix |
|---|---|---|---|---|---|---|
| 12-14 | the student pages | TEACHER, ADMIN, SYSTEM | (no mark) → add a note: staff cannot open them | `lib/route-policies.ts:17` admits only STUDENT; legacy `proxy.ts:19-24` admits all four roles | STU-01 | `primary_parity_staff_student_view_20261011` |
| 22 | `/student/read/[articleId]` | STUDENT | same → reduced | legacy `lib/paragraph-utils.ts` is absent; no `buildWordMaps` (legacy `components/articles/article-content.tsx:115`); `components/articles/article-card.tsx:40` reads the activity of all students | STU-07, STU-10, STU-16 | quick fixes; read along |
| 23 | `/student/lesson/[id]` | STUDENT | same → reduced | resume with `Math.ceil` (`components/lesson/lesson-progress-bar.tsx:158`); no restart (`components/lesson/task/task-lesson-summary.tsx:459-470`; legacy `components/lesson/lesson-progress-bar.tsx:410` `onRestart`); the SAQ does not show the saved answer (`components/lesson/practice/lesson-task-saq.tsx:40-46`); task 10 has one matching game | STU-02, STU-05, STU-17, STU-14 | quick fixes; lesson repeat; lesson games |
| 24 | `/student/stories/**` → (none) | STUDENT | removed → missing | no page and no API; the shared schema has `stories` and `chapters` (`packages/db/src/schema/stories.ts:11,33`) with 0 rows; the ETL skips them (`packages/db/src/migrations-data/primary-legacy-import.ts:79`); no owner decision for a removal exists; the note "The new database has no stories" is false | STU-04 | `primary_parity_stories_20261011` |
| 25 | `/student/goals` → Class Quest | STUDENT | merged → removed | Class Quest is a weekly class quest that a teacher assigns (`packages/db/src/schema/primary-class-quest.ts:13-30`), not a student goal; owner decision "drop" of 2026-10-11 | STU-12 | none (drop) |
| 28 | the five game routes → `/student/games/apk/[cartridgeId]` | STUDENT | moved → removed, redirect planned | no route under `app/[locale]/(student)/student/games/` for `vocabulary/*` or `sentences/*`, so an old URL gives 404; owner follow-up of 2026-10-11: redirect each old URL to the cartridge with the same name | STU-09, STU-21 | `primary_parity_cleanup_20261011` |
| 30 | `/student/history` | STUDENT | same → same, one column removed by plan | the "rated" column is gone by plan (`measure/tracks/primary_ux_rework_20261003/plan.md:92`) | STU-23 | none |
| 31 | `/student/reports` | STUDENT | same → reduced | `components/dashboard/report-panels.tsx` has the December 2025 panels; the widgets of legacy `a62204a` (`components/dashboard/student/*`) are missing | STU-11 | after the cutover |
| 32 | `/student/sentences` | STUDENT | same → reduced | the manage tab has no "Due" column (commit `c9bed841a`) | STU-18 | after the cutover |
| 34 | `/settings/user-profile` | STUDENT | renamed → renamed, reduced | `app/api/users/[id]/route.ts:25-36` needs ADMIN or SYSTEM, so a student gets 403 on a name change | STU-06 | quick fixes |
| 49 | `/teacher/dashboard` | TEACHER | renamed → renamed, reduced | 4 tiles (`app/[locale]/teacher/dashboard/page.tsx:59-62`); no legacy numbers or class table with CSV (legacy `components/dashboard/teacher/teacher-overview-kpis.tsx`, `class-summary-table.tsx`); the book slot is a placeholder | TCH-03, TCH-02 | teacher home; class books |
| 53 | `/teacher/class-roster/[classroomId]` | TEACHER | same route → reduced | the book card is below the sign-in panel and the roster; an empty catalogue hides the assign form; the cutover ETL loads no catalogue; the "Settings" link does nothing (both apps) | TCH-01, TCH-02, TCH-08 | class books; quick fixes |
| 56 | `/teacher/reports` | TEACHER | same → reduced | 3 tiles; the "Active this week" tile is missing (legacy `components/teacher/teacher-progress-reports.tsx:338`) | TCH-05 | quick fixes |
| 57 | `/teacher/reports/[classroomId]` → class page | TEACHER | merged → missing | no route in the new app; legacy `app/[locale]/teacher/reports/[classroomId]/page.tsx` has the class report with 6 tabs; the book progress grid gives the lesson view | TCH-04 | after the cutover |
| 59 | `/teacher/workbook-generate` → (none) | TEACHER | removed → removed with the owner decision | owner decision "drop" of 2026-10-11 (TCH-06, TCH-07); the new item "Print this lesson" uses the Workbooks primary template | TCH-06, TCH-07 | `primary_parity_print_lesson_20261011` (new item) |
| 78 | `/admin/dashboard` | ADMIN, SYSTEM | same → reduced | three "Data unavailable" cards (`app/[locale]/admin/dashboard/page.tsx:35-72`); sample charts (`components/dashboard/class-activity-chart.tsx:27,38,242`); no school selector for SYSTEM | ADM-01, SYS-03 | `primary_parity_admin_dashboard_20261011` |
| 79 | `/admin/dashboard/{teachers,students}` | ADMIN | same → same, empty in both builds | empty pages in both apps | ADM-13 | admin dashboard |
| 80 | `/admin/teachers` | SYSTEM | same → same for ADMIN, reduced for SYSTEM | `server/controllers/teacherController.ts:49` reads no `schoolId`; a SYSTEM user cannot move a teacher | ADM-07, SYS-05 | `primary_parity_school_management_20261011` |
| 81 | `/admin/students`, `/admin/students/classrooms` | ADMIN | same → reduced | classroom edit returns 400 (`server/controllers/classroomController.ts:159-161` reads `classroomName`); no teacher picker; 0 toast calls in `app/[locale]/admin/students/page.tsx` (failures only in `console.error` at :269, :318, :352) | ADM-02, ADM-03, ADM-06 | quick fixes; school management |
| 82 | `/admin/import-data` | SYSTEM | same → reduced | a SYSTEM import writes no school (`app/api/upload/classes/route.ts:1058`); no class conflict choice | ADM-04, ADM-05 | school management; ADM-05 after the cutover |
| 83 | `/admin/article-creation` | ADMIN | same → to be removed | the component differs only in imports, but the generator is older than legacy (`utils/google.ts:19-24`); owner follow-up of 2026-10-11: remove the page | ADM-11, CNT-02 | `primary_parity_cleanup_20261011` |
| 91 | `/system/dashboard` | SYSTEM | same → missing | heading and the text "System Dashboard Description" only (`app/[locale]/system/dashboard/page.tsx:7`); legacy `components/dashboard/system/*` has 6 files with 2553 lines | SYS-01 | `primary_parity_system_dashboard_20261011` |
| 91 | `/system/schools`, `/system/licenses/**` | SYSTEM | same → same (split the row) | same capability | SYS-07, SYS-08 | none |
| 91 | `/system/test` | SYSTEM | same → to be removed | the nav shows "Testing" (`configs/system-page-config.ts:27`; legacy hides it at `configs/system-page-config.ts:53`); "Delete All Articles" has no confirmation (`app/[locale]/system/test/page.tsx:18-23`); owner follow-up of 2026-10-11: remove the page and `deleteAllArticles` | SYS-04 | `primary_parity_cleanup_20261011` |
| 92 | `/system/ai-config` → (none) | SYSTEM | removed → removed with the owner decision; correct the note | only the credentials come from the environment; the model names are fixed in code (`utils/google.ts:19-24`, `utils/openai.ts:7-10`); owner decision "drop" of 2026-10-11 | SYS-06, CNT-02 | cleanup (model names) |
| 93 | `/system/contact-messages` → (none) | SYSTEM | removed → removed with the owner decision | owner decision of 2026-10-11: contact links replace the form (PP-3 of `primary_public_pages_20261007`); the legacy rows go to a private CSV | PUB-02, PUB-03 | public pages; rehearsal 3 (export) |
| 99 | `/`, `/about`, `/authors`, `/contact` | (signed out) | same → reduced | the home "Send message" button is in no `<form>` (`app/[locale]/(index)/page.tsx:274`); `/contact` is one line (`app/[locale]/(index)/contact/page.tsx:17`); legacy has a working form and an inbox; the footer links differ | PUB-01, PUB-02, PUB-04 | `primary_public_pages_20261007`; quick fixes |
| 100 | `/auth/signin` and the other auth pages | (signed out) | same → replaced | class code, name, and pictures; username and password; QR card; no Google sign-in (decision D8); no `?classroom_code=` prefill in `components/student-login/*`; no "session expired" notice | PUB-05, PUB-06, PUB-07 | quick fixes; PUB-06 after the cutover |
| 103 | `/~offline` → (none) | STUDENT | removed → missing with the PWA | the manifest is commented out (`app/[locale]/layout.tsx:79`); no service worker and no icons; legacy has `app/manifest.ts`, `app/sw.ts`, `app/(offline)/~offline/page.tsx` | STU-13 | `primary_parity_pwa_20261011` |

## Non-Functional Requirements

- NFR-1. ASD-STE100 for every new or changed sentence. Code, paths, and quotes stay as they are.
- NFR-2. No code, schema, migration, ETL, or runbook command changes in this track. No hash or
  checksum field (`AGENTS.md`, hashing policy).
- NFR-3. No password, no database URL, no student name, and no free-text owner note goes into the
  repository.
- NFR-4. Each `file:line` points at integration `ca8869cea` or at legacy `bfea121`. If a line moved
  when the track runs, check the evidence again and give the new line.
- NFR-5. Before the first write to `primary-parity-integration`, tell the monorepo session (the
  session that wrote the uncommitted section of E-3).

## Acceptance Criteria

- AC-1. Every row of Table A is corrected in `docs/primary-whats-moved.md`, with the evidence, the row
  IDs, and the owner of the fix. No "removed" mark is without an owner decision and a date.
- AC-2. Each corrected row names the legacy page, the new page, and the role. The smoke run of the
  side-by-side kit (`primary_parity_acceptance_20261011`) can open three of these pairs: the system
  dashboard as SYSTEM (SYS-01), the admin dashboard as ADMIN (ADM-01), and the lesson summary of a
  finished lesson as STUDENT (STU-05). Its captures show the differences that the corrected marks
  state.
- AC-3. `cutover-result-20261011.md` has no claim that the placeholder "does not indicate a migration
  failure", and it has the six facts of FR-3. Its status line says "stopped after C10".
- AC-4. The migration track plan shows `[b]` for the cutover run, and the old command sheet names its
  replacement.
- AC-5. `legacy_games_removal_20261006` has no M4 task. Its spec and `docs/primary-games-integration.md`
  name `primary_parity_cleanup_20261011` as the owner of M4.
- AC-6. The program file and `measure/lessons-learned.md` have the rule of FR-5. The lessons-learned
  file has 50 lines or less, and each test of E-6 passes.
- AC-7. `triage-decisions.md` lists every triage row (73 rows: SYS 8, ADM 13, TCH 13, STU 24, PUB 8, CNT 7) with its final decision and the
  location of the source files. It has no free-text note.

## Out of Scope

- Any code fix of a row in Table A (each member fixes its rows).
- The ETL reason texts in `primary-legacy-import.ts` (`DROPPED_TABLES`): the stories member changes
  the stories line; `primary_parity_rehearsal3_20261011` checks the other lines.
- The new command sheet and the cutover spec §11 calendar (`primary_parity_rehearsal3_20261011`).
- The tech-debt rows "ElvGames art still ships" and "`/system/test` ships destructive dev tools"
  (`primary_parity_cleanup_20261011`).
- Changes to the manuals and videos (`whats-new-2026-10.html`): this track tells the PR session only.
- A change to the legacy repository or to the triage files.

## Member Questions

None. The owner decisions of 2026-10-11 cover every corrected row.
