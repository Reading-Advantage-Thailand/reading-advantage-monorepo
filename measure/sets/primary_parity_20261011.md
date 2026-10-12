# Track Set: Primary Parity Before the Cutover

- **Set ID:** `primary_parity_20261011`
- **Status:** in_progress
- **Created:** 2026-10-11
- **Goal:** The monorepo Primary build does every job that legacy `bfea121` does for the "before cutover" rows of the 2026-10-11 triage, plus the three approved new items, and it passes a side-by-side acceptance and rehearsal 3.
- **Start gate:** none

## Shared Decisions

| Date | Topic | Decision | Source |
| --- | --- | --- | --- |
| 2026-10-11 | scope and order | The set covers the triage rows with "before cutover" and the follow-up decisions. The "after cutover" rows wait (see Later work). | user (`~/Desktop/primary-parity-triage/triage-decisions-20261011-214840.json`, `followup-decisions-20261011.json`) |
| 2026-10-11 | scope and order | Records and the acceptance kit come first. Then the small fixes and the removals, then the blockers that the owner found, then the larger ports. Rehearsal 3 is last. | user (overview approval) |
| 2026-10-11 | split rule | One member for each job that closes alone. All small regressions are one bug member. All removals are one chore member. | user (overview approval) |
| 2026-10-11 | rule | Port the behavior, not the legacy code: Drizzle schema in `packages/db`, domain functions with Zod contracts, permissions, and tests, the AI adapter, TenantDB, and the RPG skin. Do not copy legacy components or Prisma models. | user; `AGENTS.md` |
| 2026-10-11 | rule | When a new feature does the same job as a legacy feature, extend the new feature. Do not add a second page. | user |
| 2026-10-11 | rule | Improve the old UX. Each member with a UI starts with a design in the RPG skin, then captures, then the owner's look check before the merge. | user (triage notes: "Just be careful of our old, crappy UX when porting over") |
| 2026-10-11 | rule | Acceptance: a side-by-side browser check against legacy `bfea121` on a rehearsal copy with the same school data, then the owner's look check. A matching route name is not evidence. | user (Q-03) |
| 2026-10-11 | rule | The feature freeze stays: parity work, bug fixes, and the three approved new items only. | user (Q-01, follow-up) |
| 2026-10-11 | rule | The new cutover date is set after every member before rehearsal 3 passes acceptance. Rehearsal 3 tests the final build with no change after it. | user (Q-02) |
| 2026-10-11 | rule | Legacy stays live: build trigger `primary-advantege-prod` off, the five scheduler jobs paused. | user (Q-04, Q-05) |
| 2026-10-11 | rule | Workbooks and mastery-advantage make all content. The app has no content generation. | user (Q-05 note) |
| 2026-10-11 | rule | Removed: the System Testing page and `deleteAllArticles` (nobody may delete all articles), Admin Article Creation, and the old game host (M4) after the ElvGames assets are copied to `~/Desktop/Asset Packs`. | user (follow-up) |
| 2026-10-11 | rule | New Primary server code logs with `lib/observability/logger.ts`, never `console.error`. | user (2026-10-07) |
| 2026-10-11 | rule | Open tech debt in scope: "ElvGames art still ships" and "`/system/test` ships destructive dev tools" go to `primary_parity_cleanup_20261011`; "Upload routes: school guard keys off stored row" goes to `primary_parity_school_management_20261011`. `ignoreBuildErrors` waits. | user (`measure/tech-debt.md`) |
| 2026-10-11 | rule | Member answers: the system dashboard shows a totals strip, then a schools table (SYS-01); the school license view is view only; staff see the student pages in a preview mode that saves nothing (STU-01); stories are a tab in Read (STU-04). | user |
| 2026-10-05 | rule | One heavy job at a time on this machine (7 GB). No local run with 25 students; use 2 or 3 students or the rehearsal environment. | user |
| 2026-10-12 | rule | The owner reviewed the plans. The set runs to the end with no stop for owner input. Each member uses the default answers of its Member Questions. The progress report `~/Desktop/primary-parity-progress/index.html` lists each default and each look check, and the owner can change them after. | user (2026-10-12) |
| 2026-10-12 | scope and order | The QR code path (Workbooks decision D1, option B: the printed `/b/<book>/<n>` link) is in this set as a new member after the class books. | user (2026-10-12) |
| 2026-10-12 | rule | A Sonnet helper agent does each plan phase. At most two lanes run at the same time in two worktrees. Heavy jobs (the app type check, the full app tests, builds, the dev server, and browser runs) take turns through one lock file. | user (2026-10-12); 7 GB rule of 2026-10-05 |
| 2026-10-12 | target | The cutover target is the weekend of 2026-10-17 and 2026-10-18, after acceptance and rehearsal 3 pass. | user (2026-10-12) |

## Members

| Order | Track | Type | Scope | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | [primary_parity_records_20261011](../tracks/primary_parity_records_20261011/) | chore | Correct the wrong "same" marks and the cutover record, move M4 out of the games removal track, add the behavior-evidence rule | — | completed |
| 1 | [primary_parity_acceptance_20261011](../tracks/primary_parity_acceptance_20261011/) | chore | Side-by-side kit: legacy and new on rehearsal copies, matching accounts, a capture script, the behavior contract template | — | completed |
| 2 | [primary_parity_quick_fixes_20261011](../tracks/primary_parity_quick_fixes_20261011/) | bug | ADM-02, ADM-06, TCH-05, TCH-08, STU-02, STU-03, STU-06, STU-07, STU-08, STU-16, STU-17, PUB-04, PUB-05 | primary_parity_acceptance_20261011 | in_progress |
| 2 | [primary_parity_cleanup_20261011](../tracks/primary_parity_cleanup_20261011/) | chore | Remove the Testing page, `deleteAllArticles`, Admin Article Creation; M4 with the asset copy first; old game URL redirects (STU-09); AI model names into the adapter configuration (CNT-02) | primary_parity_acceptance_20261011 | in_progress |
| 3 | [primary_parity_class_books_20261011](../tracks/primary_parity_class_books_20261011/) | feature | TCH-01, TCH-02: catalogue and guide imports in the ETL and the runbook, the book card at the top, the dashboard book slot | primary_parity_acceptance_20261011 | in_progress |
| 3 | [primary_parity_staff_student_view_20261011](../tracks/primary_parity_staff_student_view_20261011/) | feature | STU-01: staff open the student pages as a view, and staff actions save nothing | primary_parity_acceptance_20261011 | new |
| 4 | [primary_parity_admin_dashboard_20261011](../tracks/primary_parity_admin_dashboard_20261011/) | feature | ADM-01, SYS-03: real school data, new design, school selector for SYSTEM | primary_parity_acceptance_20261011 | in_progress |
| 4 | [primary_parity_teacher_home_20261011](../tracks/primary_parity_teacher_home_20261011/) | feature | TCH-03: the missing numbers and a class table with CSV on the new home | primary_parity_acceptance_20261011 | in_progress |
| 4 | [primary_parity_qr_path_20261011](../tracks/primary_parity_qr_path_20261011/) | feature | QR code path (Workbooks D1, option B): return to the lesson after sign-in, a signed-out landing for Primary and Tutor readers, the writing QR target, clear pages for each other case, one go/no-go check | primary_parity_class_books_20261011 | in_progress |
| 5 | [primary_parity_system_dashboard_20261011](../tracks/primary_parity_system_dashboard_20261011/) | feature | SYS-01: platform overview with a new design | primary_parity_admin_dashboard_20261011 | in_progress |
| 5 | [primary_parity_school_management_20261011](../tracks/primary_parity_school_management_20261011/) | feature | ADM-03, ADM-04, SYS-05, and the new school license view | primary_parity_quick_fixes_20261011 | in_progress |
| 6 | [primary_parity_stories_20261011](../tracks/primary_parity_stories_20261011/) | feature | STU-04: stories, chapters, and their questions in the ETL; 3 pages in the RPG skin | primary_parity_acceptance_20261011 | new |
| 6 | [primary_parity_read_along_20261011](../tracks/primary_parity_read_along_20261011/) | feature | STU-10: word alignment and click-to-seek with a better UX | primary_parity_quick_fixes_20261011 | in_progress |
| 7 | [primary_parity_lesson_repeat_20261011](../tracks/primary_parity_lesson_repeat_20261011/) | feature | STU-05: teacher "Teach again", student "Start again", attempt history | primary_parity_quick_fixes_20261011 | new |
| 7 | [primary_parity_lesson_games_20261011](../tracks/primary_parity_lesson_games_20261011/) | feature | STU-14: Chibi Quest games in a vocabulary step and a sentence step of the lesson | primary_parity_cleanup_20261011 | new |
| 8 | [primary_parity_print_lesson_20261011](../tracks/primary_parity_print_lesson_20261011/) | feature | TCH-07: "Print this lesson" with the Workbooks primary template | primary_parity_class_books_20261011 | new |
| 8 | [primary_parity_pwa_20261011](../tracks/primary_parity_pwa_20261011/) | feature | STU-13: manifest, icons, a worker that replaces the legacy worker | primary_parity_acceptance_20261011 | new |
| 9 | [primary_parity_rehearsal3_20261011](../tracks/primary_parity_rehearsal3_20261011/) | chore | The ETL changes of the members, PUB-03 contact export, full acceptance, rehearsal 3, the new command sheet | all members above (incl. qr_path), primary_public_pages_20261007 | new |

## Open Questions

- PUB-01: your Thai copy and the cn/tw review (owner: `primary_public_pages_20261007`, which must finish before rehearsal 3).
- CNT-01: one real write of the Workbooks injector into a rehearsal copy (owner: the Workbooks session; a start condition of `primary_parity_rehearsal3_20261011`).

- QR code path peer requests (owner: `primary_parity_qr_path_20261011`): Workbooks sets `article_url` to `https://primary.reading-advantage.com/b/<book>/<n>` for Origins 3.2, Quest 4, and the insert; Tutor adds a lesson route by Primary book key and lesson number.

## Later Work (after the cutover, no track yet)

SYS-02 AI insights for all scopes, ADM-05 import conflict choice, TCH-04 class report tabs, TCH-09 assignment "Delete students", STU-11 student report widgets, STU-18 "Due" column, STU-19 license redeem, STU-20 next-level bar, PUB-06 "session expired" notice, CNT-04 demo reset, CNT-05 quiz start log, games removal M3 (Reading Advantage and Advantage Games).
