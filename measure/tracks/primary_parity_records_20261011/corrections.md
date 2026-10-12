# Corrections — rows of `docs/primary-whats-moved.md`

Source: Table A of `spec.md` (FR-2). Check date: 2026-10-12, integration `2c33cc036`, legacy `bfea121`.
Doc lines are the lines of the doc at `ca8869cea`. Evidence paths are in `apps/primary-advantage/`
unless they start with "legacy" or `packages/`. Each `file:line` was read again on 2026-10-12.

## Fact check (Phase 1, read only)

- E-1 confirmed. Import `a56281cd4` added 480 files under `apps/primary-advantage/`. 471 have the same blob
  as legacy `1e1cc34`; 2 differ (`next.config.ts`, `package.json`); 7 are absent from `1e1cc34`
  (`.eslintrc.json`, `data/A0-story-example.json`, `data/A1-story-example.json`,
  `data/A2-story-example.json`, `data/db.json`, `data/story-prompts.json`, `data/story-schema.ts`).
  Legacy `1e1cc34..bfea121` has 122 commits that are not merges and 210 with the merges.
- Traffic confirmed (read-only `gcloud run services describe`, 2026-10-12): `primary-advantage-app-00125-9wd`
  has 100%. Revision `primary-advantage-app-00130-daq` has the tag `cutover` and no traffic. The tags
  `rehearsal1` and `rehearsal2` also have no traffic.
- E-3 confirmed. `git status --short` shows `M measure/tracks/primary_legacy_data_migration_20261004/cutover-result-20261011.md`:
  the section "Owner login and existing limitation" is still uncommitted. Phase 3 replaces it.

## Line corrections against the spec

- `primary-class-quest.ts:13-30` is now `:14-30` (the table starts at line 14).
- `teacherController.ts:49` is now `:21-60` (`getTeachersController`); legacy reads `schoolId` at `:57`.
- Admin dashboard "Data unavailable" cards: `:35-72` is now `:47,66,85`.
- STU-18: no commit cite. Evidence is `components/manage-tab.tsx` (no due text) against legacy `components/manage-tab.tsx:49,69`.
- Legacy `proxy.ts:19-24` stays; the `/student` entry is at `:20`.
- Not re-read in code: the "task 10 has one matching game" claim of row 23 (owner row STU-14). The lesson games member checks it.

## Table of corrections

| Doc line | Legacy page | New page | Role | Mark now → new | Evidence | Rows | Owner of the fix |
|---|---|---|---|---|---|---|---|
| 12-14 | the student pages | `/student/**` (same routes) | TEACHER, ADMIN, SYSTEM | (no mark) → add a note: staff cannot open them | `lib/route-policies.ts:17` admits only STUDENT; legacy `proxy.ts:19-24` (`/student` at :20) admits all four roles | STU-01 | `primary_parity_staff_student_view_20261011` |
| 22 | `/student/read/[articleId]` | `/student/read/[articleId]` | STUDENT | same → reduced | legacy `lib/paragraph-utils.ts` exists in legacy and is absent in the new app; no `buildWordMaps` (legacy `components/articles/article-content.tsx:115`); `components/articles/article-card.tsx:40` reads the activity of all students | STU-07, STU-10, STU-16 | quick fixes; read along |
| 23 | `/student/lesson/[id]` | `/student/lesson/[id]` | STUDENT | same → reduced | resume with `Math.ceil` (`components/lesson/lesson-progress-bar.tsx:158`); no restart (`components/lesson/task/task-lesson-summary.tsx:459-470`; legacy `components/lesson/lesson-progress-bar.tsx:410` `onRestart`); the SAQ does not show the saved answer (`components/lesson/practice/lesson-task-saq.tsx:40-46`); task 10 has one matching game | STU-02, STU-05, STU-17, STU-14 | quick fixes; lesson repeat; lesson games |
| 24 | `/student/stories`, `/student/stories/[storieId]`, `/student/stories/[storieId]/[chapterNum]` | (none) | STUDENT | removed → missing | no page and no API; the shared schema has `stories` and `chapters` (`packages/db/src/schema/stories.ts:11,33`) with 0 rows; the ETL skips them (`packages/db/src/migrations-data/primary-legacy-import.ts:79`); no owner decision for a removal exists; the note "The new database has no stories" is false | STU-04 | `primary_parity_stories_20261011` |
| 25 | `/student/goals` | `/student/quest/battle` and the Class Quest card on Home | STUDENT | merged → removed | Class Quest is a weekly class quest that a teacher assigns (`packages/db/src/schema/primary-class-quest.ts:14-30`), not a student goal; owner decision "drop" of 2026-10-11 | STU-12 | none (drop) |
| 28 | `/student/games/vocabulary/*`, `/student/games/sentences/potion-rush` | `/student/games/apk/[cartridgeId]` | STUDENT | moved → removed, redirect planned | no route under `app/[locale]/(student)/student/games/` for `vocabulary/*` or `sentences/*`, so an old URL gives 404; owner follow-up of 2026-10-11: redirect each old URL to the cartridge with the same name | STU-09, STU-21 | `primary_parity_cleanup_20261011` |
| 30 | `/student/history` | `/student/history` | STUDENT | same → same, one column removed by plan | the "rated" column is gone by plan (`measure/tracks/primary_ux_rework_20261003/plan.md:92`) | STU-23 | none |
| 31 | `/student/reports` | `/student/reports` | STUDENT | same → reduced | `components/dashboard/report-panels.tsx` has the December 2025 panels; the widgets of legacy `a62204a` (`components/dashboard/student/*`) are missing | STU-11 | after the cutover |
| 32 | `/student/sentences` | `/student/sentences` | STUDENT | same → reduced | the manage tab has no "Due" text (`components/manage-tab.tsx` has no due code; legacy `components/manage-tab.tsx:49,69`) | STU-18 | after the cutover |
| 34 | `/settings/user-profile` | `/settings/user-profile` | STUDENT | renamed → renamed, reduced | `app/api/users/[id]/route.ts:25-36` needs ADMIN or SYSTEM, so a student gets 403 on a name change | STU-06 | quick fixes |
| 49 | `/teacher/dashboard` | `/teacher/dashboard` | TEACHER | renamed → renamed, reduced | 4 tiles (`app/[locale]/teacher/dashboard/page.tsx:59-62`); no legacy numbers or class table with CSV (legacy `components/dashboard/teacher/teacher-overview-kpis.tsx`, `class-summary-table.tsx`); the book slot is a placeholder | TCH-03, TCH-02 | teacher home; class books |
| 53 | `/teacher/class-roster/[classroomId]` | `/teacher/class-roster/[classroomId]` | TEACHER | same route → reduced | the book card is below the sign-in panel and the roster; an empty catalogue hides the assign form; the cutover ETL loads no catalogue; the "Settings" link does nothing (both apps) | TCH-01, TCH-02, TCH-08 | class books; quick fixes |
| 56 | `/teacher/reports` | `/teacher/reports` | TEACHER | same → reduced | 3 tiles; the "Active this week" tile is missing (legacy `components/teacher/teacher-progress-reports.tsx:338`) | TCH-05 | quick fixes |
| 57 | `/teacher/reports/[classroomId]` | (none; the class page has a Reports tab) | TEACHER | merged → missing | no route in the new app; legacy `app/[locale]/teacher/reports/[classroomId]/page.tsx` has the class report with 6 tabs; the book progress grid gives the lesson view | TCH-04 | after the cutover |
| 59 | `/teacher/workbook-generate` | (none) | TEACHER | removed → removed with the owner decision | owner decision "drop" of 2026-10-11 (TCH-06, TCH-07); the new item "Print this lesson" uses the Workbooks primary template | TCH-06, TCH-07 | `primary_parity_print_lesson_20261011` (new item) |
| 78 | `/admin/dashboard` | `/admin/dashboard` | ADMIN, SYSTEM | same → reduced | three "Data unavailable" cards (`app/[locale]/admin/dashboard/page.tsx:47,66,85`); sample charts (`components/dashboard/class-activity-chart.tsx:27,38,242`); no school selector for SYSTEM | ADM-01, SYS-03 | `primary_parity_admin_dashboard_20261011` |
| 79 | `/admin/dashboard/teachers`, `/admin/dashboard/students` | same routes | ADMIN | same → same, empty in both builds | empty pages in both apps | ADM-13 | admin dashboard |
| 80 | `/admin/teachers` | `/admin/teachers` | SYSTEM | same → same for ADMIN, reduced for SYSTEM | `getTeachersController` (`server/controllers/teacherController.ts:21-60`) reads no `schoolId`; legacy reads it at `server/controllers/teacherController.ts:57`; a SYSTEM user cannot move a teacher | ADM-07, SYS-05 | `primary_parity_school_management_20261011` |
| 81 | `/admin/students`, `/admin/students/classrooms` | same routes | ADMIN | same → reduced | classroom edit returns 400 (`server/controllers/classroomController.ts:159-161` reads `classroomName`); no teacher picker; 0 toast calls in `app/[locale]/admin/students/page.tsx` (failures only in `console.error` at :269, :318, :352) | ADM-02, ADM-03, ADM-06 | quick fixes; school management |
| 82 | `/admin/import-data` | `/admin/import-data` | SYSTEM | same → reduced | a SYSTEM import writes no school (`app/api/upload/classes/route.ts:1058`); no class conflict choice | ADM-04, ADM-05 | school management; ADM-05 after the cutover |
| 83 | `/admin/article-creation` | `/admin/article-creation` | ADMIN | same → to be removed | the component differs only in imports, but the generator is older than legacy (`utils/google.ts:19-24`); owner follow-up of 2026-10-11: remove the page | ADM-11, CNT-02 | `primary_parity_cleanup_20261011` |
| 91 | `/system/dashboard` | `/system/dashboard` | SYSTEM | same → missing | heading and the text "System Dashboard Description" only (`app/[locale]/system/dashboard/page.tsx:7`); legacy `components/dashboard/system/*` has 6 files with 2553 lines | SYS-01 | `primary_parity_system_dashboard_20261011` |
| 91 | `/system/schools`, `/system/licenses/**` | same routes | SYSTEM | same → same (split the row) | same capability | SYS-07, SYS-08 | none |
| 91 | `/system/test` | `/system/test` | SYSTEM | same → to be removed | the nav shows "Testing" (`configs/system-page-config.ts:27`; legacy hides it at `configs/system-page-config.ts:53`); "Delete All Articles" has no confirmation (`app/[locale]/system/test/page.tsx:18-23`); owner follow-up of 2026-10-11: remove the page and `deleteAllArticles` | SYS-04 | `primary_parity_cleanup_20261011` |
| 92 | `/system/ai-config` | (none) | SYSTEM | removed → removed with the owner decision; correct the note | only the credentials come from the environment; the model names are fixed in code (`utils/google.ts:19-24`, `utils/openai.ts:7-10`); owner decision "drop" of 2026-10-11 | SYS-06, CNT-02 | cleanup (model names) |
| 93 | `/system/contact-messages` | (none) | SYSTEM | removed → removed with the owner decision | owner decision of 2026-10-11: contact links replace the form (PP-3 of `primary_public_pages_20261007`); the legacy rows go to a private CSV | PUB-02, PUB-03 | public pages; rehearsal 3 (export) |
| 99 | `/`, `/about`, `/authors`, `/contact` | same routes | (signed out) | same → reduced | the home "Send message" button is in no `<form>` (`app/[locale]/(index)/page.tsx:274`); `/contact` is one line (`app/[locale]/(index)/contact/page.tsx:17`); legacy has a working form and an inbox; the footer links differ | PUB-01, PUB-02, PUB-04 | `primary_public_pages_20261007`; quick fixes |
| 100 | `/auth/signin` and the other auth pages | same routes | (signed out) | same → replaced | class code, name, and pictures; username and password; QR card; no Google sign-in (decision D8); no `?classroom_code=` prefill in `components/student-login/*`; no "session expired" notice | PUB-05, PUB-06, PUB-07 | quick fixes; PUB-06 after the cutover |
| 103 | `/~offline` | (none) | STUDENT | removed → missing with the PWA | the manifest is commented out (`app/[locale]/layout.tsx:79`); no service worker and no icons; legacy has `app/manifest.ts`, `app/sw.ts`, `app/(offline)/~offline/page.tsx` | STU-13 | `primary_parity_pwa_20261011` |
