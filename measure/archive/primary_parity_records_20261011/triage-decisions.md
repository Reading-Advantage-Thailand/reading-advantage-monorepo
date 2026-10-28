# Triage decisions of 2026-10-11

The owner's decisions are outside the repository. The repository is public, and the files hold internal
remarks of the owner. This record copies no JSON and no free-text note. It gives the decision values only.

## Source files

- Folder: `~/Desktop/primary-parity-triage/` (the one source; not in the repository).
- `triage-decisions-20261011-214840.json`: `_saved_at` = `2026-10-11T21:48:40.027573+08:00`.
- `triage-decisions-latest.json`: the same content as the file above (`_saved_at` is the same value).
- `followup-decisions-20261011.json`: `date` = `2026-10-11`. It replaces the first choice of 6 rows (marked below).
- `triage-form.html`: the form with the evidence of each row.

## Questions of the form

- Q-01: the feature freeze stays. Q-02: the cutover date is set after acceptance. Q-03: accept each feature by both checks (side-by-side and look check).
- Q-04: the legacy build trigger stays off. Q-05: the five legacy scheduler jobs stay paused.

## Rows (73: SYS 8, ADM 13, TCH 13, STU 24, PUB 8, CNT 7)

Owner member: a track of the set `primary_parity_20261011`, "keep" (no change), "drop" (no work), or "after the cutover" (Later Work).

| ID | Area | Feature | Status | Choice | Timing | Owner member |
|---|---|---|---|---|---|---|
| SYS-01 | System | System dashboard: overview, metrics, license usage, active users, activity… | MISSING | port | before | `primary_parity_system_dashboard_20261011` |
| SYS-02 | System | AI insights for all scopes: system, school, teacher, and the student AI coach | MISSING | port | after | after the cutover |
| SYS-03 | System | School selector on the admin dashboard for SYSTEM users | MISSING | port | before | `primary_parity_admin_dashboard_20261011` |
| SYS-04 | System | Testing page: visible in the nav, and "Delete All Articles" has no confirmation | REDUCED | remove (follow-up) | before | `primary_parity_cleanup_20261011` |
| SYS-05 | System | SYSTEM teacher-school management: school filter, school column, school… | MISSING | port | before | `primary_parity_school_management_20261011` |
| SYS-06 | System | AI provider config page (provider CRUD with Secret Manager, model for each task) | MISSING | drop | – | drop |
| SYS-07 | System | Schools page: Create School dialog | SAME | keep | – | keep |
| SYS-08 | System | Licenses: list, filter, sort, pages, edit, delete, create | SAME | keep | – | keep |
| ADM-01 | Admin | Admin dashboard with real school data: time range, 7 KPI cards, adoption by… | REDUCED | port | before | `primary_parity_admin_dashboard_20261011` |
| ADM-02 | Admin | Classroom edit: rename, grade, student password (now fails with HTTP 400) | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| ADM-03 | Admin | Classroom edit: assign teachers to a class | MISSING | port | before | `primary_parity_school_management_20261011` |
| ADM-04 | Admin | Import data: target school selector for SYSTEM users | MISSING | port | before | `primary_parity_school_management_20261011` |
| ADM-05 | Admin | Import data: classroom conflict choice, and auto-create of missing… | MISSING | port | after | after the cutover |
| ADM-06 | Admin | Students page: success and error messages for add, edit, and delete | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| ADM-07 | Admin | Teachers list for ADMIN: search, stats, add with classes, edit with… | SAME | keep | – | keep |
| ADM-08 | Admin | Add teacher, add student (SYSTEM gets a school selector) | SAME | keep | – | keep |
| ADM-09 | Admin | Classrooms: list, search, create, delete | SAME | keep | – | keep |
| ADM-10 | Admin | Import data: CSV upload, preview, templates | SAME | keep | – | keep |
| ADM-11 | Admin | Article creation: generate, draft, approve | SAME | remove (follow-up) | before | `primary_parity_cleanup_20261011` |
| ADM-12 | Admin | School profile and school admins (settings) | SAME | keep | – | keep |
| ADM-13 | Admin | Admin dashboard sub-pages Students and Teachers (empty in both apps) | SAME | keep | – | keep |
| TCH-01 | Teacher | Class books: the book catalogue and the teacher guide are not loaded, so the… | REDUCED | extend | before | `primary_parity_class_books_20261011` |
| TCH-02 | Teacher | Class books: the card is below the sign-in panel and the full roster, and… | REDUCED | extend | before | `primary_parity_class_books_20261011` |
| TCH-03 | Teacher | Teacher dashboard numbers: active in 30 days with engagement %, average… | REDUCED | extend | before | `primary_parity_teacher_home_20261011` |
| TCH-04 | Teacher | Class report page: KPI strip, 6 tabs, batch actions | MISSING | extend | after | after the cutover |
| TCH-05 | Teacher | Reports overview: the "Active this week" tile | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| TCH-06 | Teacher | Export workbook button (article and story, JSON download) | MISSING | drop | – | drop |
| TCH-07 | Teacher | Workbook generator page | MISSING | new item: Print this lesson (follow-up) | before | `primary_parity_print_lesson_20261011` |
| TCH-08 | Teacher | Class page "Settings" link does nothing (bug in both apps) | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| TCH-09 | Teacher | Assignment detail: "Delete students" fails (bug in both apps) | REDUCED | port | after | after the cutover |
| TCH-10 | Teacher | My classes: table, search, create, edit, delete, pages | SAME | keep | – | keep |
| TCH-11 | Teacher | My students, class roster, class student list, enrollment page | SAME | keep | – | keep |
| TCH-12 | Teacher | Assignments: list, detail with stats and filters, create from the article… | SAME | keep | – | keep |
| TCH-13 | Teacher | Class code generator and class password | REPLACED | keep | – | keep |
| STU-01 | Student | Staff cannot open the student pages | REDUCED | port | before | `primary_parity_staff_student_view_20261011` |
| STU-02 | Student | Lesson resume goes to the wrong task (bug) | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| STU-03 | Student | A quiz cannot finish when a row for it already exists (bug) | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| STU-04 | Student | Stories: list, story, chapter with audio read-along, translation… | MISSING | port | before | `primary_parity_stories_20261011` |
| STU-05 | Student | Lesson "Start Again" | MISSING | port | before | `primary_parity_lesson_repeat_20261011` |
| STU-06 | Student | Settings: a student cannot change the display name (403, and no error shows) | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| STU-07 | Student | Article text: sentences that do not match a paragraph do not show (bug) | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| STU-08 | Student | Game XP does not go into the student's XP (home XP, level, and header gem) | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| STU-09 | Student | Old game URLs give 404 (bookmarks of the five legacy games) | MISSING | port (redirect) (follow-up) | before | `primary_parity_cleanup_20261011` |
| STU-10 | Student | Audio read-along: the word highlight and click-to-seek can go to the wrong word | REDUCED | port | before | `primary_parity_read_along_20261011` |
| STU-11 | Student | Student reports: reading speed and ETA, genre engagement, flashcard health… | MISSING | port | after | after the cutover |
| STU-12 | Student | Goals: the student goals page and widget, and the teacher class goals | MISSING | drop | – | drop |
| STU-13 | Student | PWA: manifest, service worker, install prompt, offline page | MISSING | port | before | `primary_parity_pwa_20261011` |
| STU-14 | Student | Lesson task 10: a choice of 4 games with the last result | REPLACED | new item: Chibi Quest games in the lesson (follow-up) | before | `primary_parity_lesson_games_20261011` |
| STU-15 | Student | Ranking dialogs for each game | MISSING | drop | – | drop |
| STU-16 | Student | Flashcard auto-save, and the "saved" chip shows data from all students | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| STU-17 | Student | Lesson task 8: the SAQ does not show the completed answer again | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| STU-18 | Student | Sentences manage tab: the "Due" column | REDUCED | port | after | after the cutover |
| STU-19 | Student | Settings: license redeem returns 405 (bug in both apps) | REDUCED | port | after | after the cutover |
| STU-20 | Student | XP bar with progress to the next level | REPLACED | extend | after | after the cutover |
| STU-21 | Student | Games catalog and the five legacy games | REPLACED | resolved (follow-up) | – | `primary_parity_cleanup_20261011` |
| STU-22 | Student | Leaderboard, mobile navigation, settings level and XP display, school… | REPLACED | keep | – | keep |
| STU-23 | Student | History: no "rated" column | REDUCED | keep | – | keep |
| STU-24 | Student | Read list, audio play and speed, translation and word dialogs, MCQ, SAQ and… | SAME | keep | – | keep |
| PUB-01 | Public and sign-in | New logged-out site: RPG-skin home with 7 sections, About, Our books… | REDUCED | extend | before | `primary_public_pages_20261007` |
| PUB-02 | Public and sign-in | Contact: the home form, the contact form API, the system inbox, and the… | MISSING | extend | before | `primary_public_pages_20261007` |
| PUB-03 | Public and sign-in | The legacy contact messages: export the rows for the sales team | MISSING | port | before | `primary_parity_rehearsal3_20261011` |
| PUB-04 | Public and sign-in | Footer: the Support link and the email address | REPLACED | extend | before | `primary_parity_quick_fixes_20261011` |
| PUB-05 | Public and sign-in | Sign-in: the ?classroom_code= prefill | REDUCED | port | before | `primary_parity_quick_fixes_20261011` |
| PUB-06 | Public and sign-in | Sign-in: the "session expired" notice | REDUCED | port | after | after the cutover |
| PUB-07 | Public and sign-in | Sign-in, sign-up, Google sign-in, and forgot password | REPLACED | keep | – | keep |
| PUB-08 | Public and sign-in | Privacy, Terms, the error and unauthorized pages, not-found | SAME | keep | – | keep |
| CNT-01 | Content and background jobs | A tested way to add new content to the new database | MISSING | extend | before | the Workbooks session (start condition of `primary_parity_rehearsal3_20261011`) |
| CNT-02 | Content and background jobs | In-app AI uses old hard-coded models | REDUCED | port | before | `primary_parity_cleanup_20261011` |
| CNT-03 | Content and background jobs | Scheduled article and story generation, and the validation and repair runs | MISSING | drop | – | drop |
| CNT-04 | Content and background jobs | Daily demo account reset in production | MISSING | port | after | after the cutover |
| CNT-05 | Content and background jobs | Quiz start activity log (POST /api/articles/activity/start) | MISSING | port | after | after the cutover |
| CNT-06 | Content and background jobs | The legacy logs table and the generation run log | REPLACED | keep | – | keep |
| CNT-07 | Content and background jobs | Game API routes (15 legacy routes) | REPLACED | keep | – | keep |

## Follow-up rows

- STU-09: Follow-up 2026-10-11 replaces the first choice (drop): redirect each old URL to the cartridge with the same name.
- STU-21: Follow-up 2026-10-11 replaces the first choice (discuss): the five catalog games are new Chibi Quest cartridges; no legacy game code stays (with M4).
- ADM-11: Follow-up 2026-10-11 replaces the first choice (keep): Admin Article Creation is removed; Workbooks and mastery-advantage make all content.
- SYS-04: Follow-up 2026-10-11 replaces the first choice (port): the Testing page and `deleteAllArticles` are removed.
- TCH-07: Follow-up 2026-10-11 replaces the first choice (drop): the Workbooks primary template prints the lesson.
- STU-14: Follow-up 2026-10-11 replaces the first choice (keep): a vocabulary step and a sentence step.
- STU-05: the first choice stands (port, before). Follow-up: the teacher "Teach again" and the student "Start again" write each finished attempt into a history.
- Follow-up M4: remove `packages/game-cartridges`, the host-proof pages, and the ElvGames assets before the cutover, after a copy of the assets (with the slicing work) to `~/Desktop/Asset Packs`. Owner: `primary_parity_cleanup_20261011`.
- Follow-up new item: a school license view for school admins (seats used and free, who holds them). Owner: `primary_parity_school_management_20261011`.
