# Primary Advantage: what moved

The map from the legacy build to the new app, for the video and manual writers.

- Legacy build: `~/Desktop/primary-advantage` at commit `bfea121` (2026-08-10).
- New app: `apps/primary-advantage` on branch `primary-parity-integration` (the cutover build, 2026-10-12).
- Labels are the navigation label or the page title, English / Thai, as the message files give them.
- Marks: **same** (the page content and behavior match legacy `bfea121`), **reduced** (the page exists, and a legacy job is missing or broken), **missing** (no page does the legacy job), **moved** (a new route), **renamed** (the same route, a new label), **merged** (the job lives inside another page), **removed** (no page; the note says what replaces it), **new** (no legacy page).
- Rule: compare page content and behavior with legacy `bfea121`. A route name is not evidence. Every "removed" mark names an owner decision and its date. The IDs in the notes (for example STU-01) are rows of the owner triage (`measure/tracks/primary_parity_records_20261011/triage-decisions.md`).

## How a student gets around

- Phone: the toolbar at the bottom has four tabs: Home, Read, Games, Me. The other pages open from the menu button (☰) at the top left.
- Desktop: the signpost at the left lists Home, Read, Games, Assignments, Sentences, Vocabulary, Reports, History, Me.
- Home is `/student/home`. The sign-in page sends a student there.
- Staff (teacher, admin, system) cannot open the student pages in this build: the route policy admits only STUDENT (`lib/route-policies.ts:17`); legacy admits all four roles (STU-01, `primary_parity_staff_student_view_20261011`).

## Student pages

| Legacy page | New route | Label (English / Thai) | Tap path from home | Mark |
|---|---|---|---|---|
| (none) | `/student/home` | Home / หน้าหลัก | Toolbar: Home | new |
| `/student/read` | `/student/read` | Read / อ่าน | Toolbar: Read | same |
| `/student/read/[articleId]` | `/student/read/[articleId]` | story title | Read → a story card | reduced. Sentences that match no paragraph do not show (legacy `lib/paragraph-utils.ts` exists in legacy and is absent in the new app); no `buildWordMaps` (legacy `components/articles/article-content.tsx:115`), so the read-along highlight can miss; the saved chip reads the activity of all students (`components/articles/article-card.tsx:40`). STU-07, STU-10, STU-16; quick fixes and read along. |
| `/student/lesson/[id]` | `/student/lesson/[id]` | Lesson / บทเรียน | Read → a story → "Study as 45-min Lesson"; or Home → "Keep reading" | reduced. Resume rounds with `Math.ceil` (`components/lesson/lesson-progress-bar.tsx:158`); no restart (`components/lesson/task/task-lesson-summary.tsx:459-470`; legacy `components/lesson/lesson-progress-bar.tsx:410`); the SAQ does not show the saved answer (`components/lesson/practice/lesson-task-saq.tsx:40-46`); task 10 has one matching game. STU-02, STU-05, STU-17, STU-14; quick fixes, lesson repeat, lesson games. |
| `/student/stories`, `/student/stories/[storieId]`, `/student/stories/[storieId]/[chapterNum]` | (none) | Stories / เรื่องราว | — | missing. No page and no API. The shared schema has `stories` and `chapters` (`packages/db/src/schema/stories.ts:11,33`) with 0 rows, and the ETL skips them (`packages/db/src/migrations-data/primary-legacy-import.ts:79`). No owner decision for a removal exists. STU-04; `primary_parity_stories_20261011`. |
| `/student/goals` | `/student/quest/battle` and the Class Quest card on Home | Learning Goals (English only in the legacy build) → Class Quest / ภารกิจห้องเรียน | Home → Class Quest card → "Go to the battle" | removed. By owner decision "drop" of 2026-10-11 (STU-12). Class Quest is a weekly class quest that a teacher assigns (`packages/db/src/schema/primary-class-quest.ts:14-30`), not a student goal. |
| `/student/assignments` | `/student/assignments` | Assignments / งานที่กำหนด | Menu → Assignments | same |
| `/student/games` | `/student/games` | Games / เกม | Toolbar: Games | same route; the catalog is new: class challenges, rewards, the word adventures banner, word games, sentence games |
| `/student/games/vocabulary/dragon-rider`, `/enchanted-library`, `/rpg-battle`, `/rune-match`, `/student/games/sentences/potion-rush` | `/student/games/apk/[cartridgeId]` | the game title | Games → a game banner | moved to cartridges, with no old routes: an old URL gives 404 (no route under `app/[locale]/(student)/student/games/` for `vocabulary/*` or `sentences/*`). By owner follow-up of 2026-10-11: redirect each old URL to the cartridge with the same name. STU-09, STU-21; `primary_parity_cleanup_20261011`. |
| (none) | `/student/games/story` | Word adventures / ผจญภัยคำศัพท์ | Games → "Word adventures" (the first banner) | new. 3D games with the student's saved words and sentences; a 2D mode for older phones. |
| `/student/history` | `/student/history` | History / ประวัติ (page: My reading / ประวัติการอ่าน) | Menu → History | same, one column dropped by plan (the "rated" column; `measure/tracks/primary_ux_rework_20261003/plan.md:92`). STU-23. |
| `/student/reports` | `/student/reports` | Reports / รายงาน | Menu → Reports | reduced. The panels are from December 2025 (`components/dashboard/report-panels.tsx`); the widgets of legacy `a62204a` (`components/dashboard/student/*`) are missing. STU-11; after the cutover. |
| `/student/sentences` | `/student/sentences` | Sentences / ประโยค (page: My sentences / ประโยคของฉัน) | Menu → Sentences | reduced. The manage tab has no "Due" text (`components/manage-tab.tsx`; legacy `components/manage-tab.tsx:49,69`). STU-18; after the cutover. |
| `/student/vocabulary` | `/student/vocabulary` | Vocabulary / คำศัพท์ (page: My words / คำศัพท์ของฉัน) | Menu → Vocabulary | same |
| `/settings/user-profile` | `/settings/user-profile` | Me / ฉัน (page: Personal information / ข้อมูลส่วนตัว); was User Profile / โปรไฟล์ผู้ใช้งาน | Toolbar: Me | renamed, reduced. A student gets 403 on a name change (`app/api/users/[id]/route.ts:25-36` needs ADMIN or SYSTEM). STU-06; quick fixes. |
| `/settings/school-profile` | `/settings/school-profile` | School Profile / โปรไฟล์โรงเรียน | Menu → School Profile | same |
| (none) | `/student/avatar` | My avatar / อวตารของฉัน | Me → "My avatar"; a student with no hero goes here first | new. The hero picker, then the inventory (the paper doll). |
| (none) | `/student/avatar/shop` | Avatar shop / ร้านค้าอวตาร | Me → My avatar → the chest "Shop" | new. Guild Points (GP) buy pieces. |
| (none) | `/student/avatar/poses` | poses of the hero | no link in the shell yet; open the route | new |
| (none) | `/student/books/[classBookId]` | Your class book / หนังสือเรียนของชั้น | Home → "See the book" | new. The class book with the lessons the teacher opened. |
| (none) | `/student/reedy` | Reedy / รีดี้ (Preview) | Home → the Reedy card; or a lesson → the Reedy link in the progress bar | new. The speaking coach. |
| (none) | `/auth/card` | QR card sign-in / เข้าสู่ระบบด้วยบัตร QR | the QR card from the teacher | new |

## Teacher pages

The teacher shell keeps the sidebar: Home, My Classes, My Students (All Students, Class Roster), Reports (Overview Reports), Assignments, Teacher manual. A classroom page has tabs: Class Roster, Reports, Reedy, Avatars, Settings.

| Legacy page | New route | Label (English / Thai) | Tap path from home | Mark |
|---|---|---|---|---|
| `/teacher/dashboard` | `/teacher/dashboard` | Home / หน้าหลัก; was Teacher Dashboard / กระบวนการของครู | Sidebar: Home | renamed, reduced. The page shows 4 tiles (`app/[locale]/teacher/dashboard/page.tsx:59-62`); the legacy numbers and the class table with CSV are missing (legacy `components/dashboard/teacher/teacher-overview-kpis.tsx`, `class-summary-table.tsx`); the book slot is a placeholder. TCH-03, TCH-02; `primary_parity_teacher_home_20261011`. |
| `/teacher/my-classes` | `/teacher/my-classes` | My Classes / ชั้นเรียนของฉัน | Sidebar: My Classes | same |
| `/teacher/my-students` | `/teacher/my-students` | My Students / นักเรียนของฉัน (All Students / นักเรียนทั้งหมด) | Sidebar: My Students → All Students | same. The reset-progress dialog stays here. |
| `/teacher/class-roster` | `/teacher/class-roster` | Class Roster / รายชื่อชั้นเรียน | Sidebar: My Students → Class Roster | same |
| `/teacher/class-roster/[classroomId]` | `/teacher/class-roster/[classroomId]` | Class Roster / ทะเบียนชั้นเรียน (the classroom tabs) | Class Roster → a class | reduced. The page gained the tabs and the class book links, but the book card is below the sign-in panel and the roster; an empty catalogue hides the assign form and the cutover ETL loads no catalogue; the "Settings" link does nothing (both apps). TCH-01, TCH-02, TCH-08; `primary_parity_class_books_20261011`, quick fixes. |
| `/teacher/class-roster/[classroomId]/enrollment` | `/teacher/class-roster/[classroomId]/enrollment` | Student Enrollment / การลงทะเบียนนักเรียน | a class → "Enroll students" | same |
| `/teacher/assignments`, `/teacher/assignments/[id]` | same routes | Assignments / งานที่กำหนด | Sidebar: Assignments | same |
| `/teacher/reports` | `/teacher/reports` | Reports / รายงาน (Overview Reports / รายงานภาพรวม) | Sidebar: Reports | reduced. 3 tiles; the "Active this week" tile is missing (legacy `components/teacher/teacher-progress-reports.tsx:338`). TCH-05; quick fixes. |
| `/teacher/reports/[classroomId]` | `/teacher/class-roster/[classroomId]` (Reports tab) and `/teacher/class-roster/[classroomId]/books/[classBookId]/progress` | Reports / รายงาน; Class progress / ความก้าวหน้าของชั้นเรียน | a class → Reports tab; a class → the class book → "Class progress" | missing. No route in the new app; legacy `app/[locale]/teacher/reports/[classroomId]/page.tsx` has the class report with 6 tabs. The Reports tab and the class progress page give the lesson view only. TCH-04; after the cutover. |
| `/teacher/student-progress/[id]` | `/teacher/student-progress/[id]` | Student Progress / ความก้าวหน้าของนักเรียน | a class → a student | same |
| `/teacher/workbook-generate` | (none) | Workbook Generator / สร้างเวิร์กบุ๊ก | — | removed. By owner decision "drop" of 2026-10-11 (TCH-06, TCH-07). Content arrives through the Workbooks injector (`docs/deployment/primary-cutover-migration-spec.md`, change 1.1). New item "Print this lesson" (`primary_parity_print_lesson_20261011`) uses the Workbooks primary template. |
| (none) | `/teacher/manual` | Teacher manual / คู่มือครู | Sidebar: Teacher manual | new |
| (none) | `/teacher/class-roster/[classroomId]/books/[classBookId]` | Lesson plan / แผนการสอน | a class → the class book | new. Pacing: which lesson is open, which is next. |
| (none) | `.../books/[classBookId]/lessons/[number]` | the lesson | Lesson plan → a lesson | new |
| (none) | `.../lessons/[number]/projector` | Projector / โปรเจกเตอร์ | a lesson → "Projector" | new. The class view for the big screen. |
| (none) | `.../lessons/[number]/rehearsal` | Rehearsal (student view) / ซ้อมสอน (มุมมองนักเรียน) | a lesson → "Rehearsal" | new |
| (none) | `.../books/[classBookId]/progress`, `.../progress/[studentId]` | Class progress / ความก้าวหน้าของชั้นเรียน | the class book → "Class progress" | new |
| (none) | `/teacher/class-roster/[classroomId]/class-sheet` | Class sheet / ใบรายชื่อชั้นเรียน | a class → "Class sheet" | new. The printed sign-in sheet with the class code. |
| (none) | `/teacher/class-roster/[classroomId]/qr-cards` | QR cards / บัตร QR | a class → "QR cards" | new |
| (none) | `/teacher/class-roster/[classroomId]/avatars` | Class avatars / อวตารของห้อง | a class → Avatars tab | new |
| (none) | `/teacher/class-roster/[classroomId]/reedy` | Reedy / รีดี้ | a class → Reedy tab | new. Reedy minutes used this month, per student. |
| (none) | `/teacher/quest` | Class Quest / ภารกิจห้องเรียน (Assign a quest / มอบหมายภารกิจ) | Home → "Class Quest" | new |
| (none) | `/teacher/quest/[questId]/live` | Live dashboard / แดชบอร์ดสด | Class Quest → "Live dashboard" | new. The projector page for the battle. |
| (none) | `/teacher/game-challenges` | Class challenges / ภารกิจเกมของชั้นเรียน | My Classes → "Class challenges" | new |

## Admin pages

| Legacy page | New route | Label (English / Thai) | Tap path from home | Mark |
|---|---|---|---|---|
| `/admin/dashboard` | `/admin/dashboard` | Dashboard / แดชบอร์ด (Admin Dashboard / แดชบอร์ดผู้ดูแลระบบ) | Sidebar: Dashboard | reduced. Three "Data unavailable" cards (`app/[locale]/admin/dashboard/page.tsx:47,66,85`); sample charts (`components/dashboard/class-activity-chart.tsx:27,38,242`); no school selector for SYSTEM. ADM-01, SYS-03; `primary_parity_admin_dashboard_20261011`. |
| `/admin/dashboard/teachers`, `/admin/dashboard/students` | same routes | Teachers / ครู, Students / นักเรียน | Sidebar: Dashboard → Teachers, Students | same. Empty pages in both builds (ADM-13). |
| `/admin/teachers`, `/admin/teachers/add` | same routes | Teachers / ครู (All Teachers, Add Teacher) | Sidebar: Teachers | same for ADMIN; reduced for SYSTEM. `getTeachersController` reads no `schoolId` (`server/controllers/teacherController.ts:21-60`; legacy reads it at `:57`), so a SYSTEM user cannot move a teacher. ADM-07, SYS-05; `primary_parity_school_management_20261011`. |
| `/admin/students`, `/admin/students/add`, `/admin/students/classrooms` | same routes | Students and Classes / นักเรียนและชั้นเรียน | Sidebar: Students and Classes | reduced. Classroom edit returns 400 (`server/controllers/classroomController.ts:159-161` reads `classroomName`); no teacher picker; no toast on the students page (`app/[locale]/admin/students/page.tsx:269,318,352` use `console.error`). ADM-02, ADM-03, ADM-06; quick fixes, school management. |
| `/admin/import-data` | `/admin/import-data` | Import Data / นำเข้าข้อมูล | Sidebar: Import Data | reduced. A SYSTEM import writes no school (`app/api/upload/classes/route.ts:1058`); no class conflict choice. ADM-04, ADM-05; school management; ADM-05 after the cutover. |
| `/admin/article-creation` | `/admin/article-creation` | Article Creation / การสร้างบทความ | Sidebar: Article Creation | same, to be removed. The generator is older than legacy (`utils/google.ts:19-24`). By owner follow-up of 2026-10-11: remove the page (ADM-11, CNT-02); `primary_parity_cleanup_20261011`. |
| (none) | `/admin` | the admin landing page with the quick actions | after sign-in | new |
| (none) | `/admin/reedy` | Reedy this month / รีดี้เดือนนี้ | the quick actions → Reedy | new |

## System pages

| Legacy page | New route | Label (English / Thai) | Mark |
|---|---|---|---|
| `/system/dashboard` | `/system/dashboard` | System Dashboard / กระบวนการของระบบ | missing. Heading and the text "System Dashboard Description" only (`app/[locale]/system/dashboard/page.tsx:7`); legacy `components/dashboard/system/*` has 6 files with 2553 lines. SYS-01; `primary_parity_system_dashboard_20261011`. |
| `/system/schools`, `/system/licenses`, `/system/licenses/create-licenses` | same routes | Schools Dashboard, Licenses Dashboard | same (SYS-07, SYS-08) |
| `/system/test` | `/system/test` | Testing | same, to be removed. The nav shows "Testing" (`configs/system-page-config.ts:27`; legacy hides it at `:53`); "Delete All Articles" has no confirmation (`app/[locale]/system/test/page.tsx:18-23`). By owner follow-up of 2026-10-11: remove the page and `deleteAllArticles` (SYS-04); `primary_parity_cleanup_20261011`. |
| `/system/ai-config` | (none) | AI Provider Config / การตั้งค่า AI Provider | removed. By owner decision "drop" of 2026-10-11 (SYS-06). Only the credentials come from the environment; the model names are fixed in code (`utils/google.ts:19-24`, `utils/openai.ts:7-10`) (CNT-02; cleanup). |
| `/system/contact-messages` | (none) | Contact Messages / ข้อความติดต่อ | removed. By owner decision of 2026-10-11: contact links replace the form (PP-3 of `primary_public_pages_20261007`); the legacy rows go to a private CSV (PUB-02, PUB-03). |

## Public and sign-in pages

| Legacy page | New route | Mark |
|---|---|---|
| `/` , `/about`, `/authors`, `/contact` | same routes | reduced. The home "Send message" button is in no `<form>` (`app/[locale]/(index)/page.tsx:274`); `/contact` is one line (`app/[locale]/(index)/contact/page.tsx:17`); legacy has a working form and an inbox; the footer links differ. PUB-01, PUB-02, PUB-04; `primary_public_pages_20261007`. |
| `/privacy-policy`, `/terms` | same routes | same |
| `/auth/signin`, `/auth/signup`, `/auth/forgot-password`, `/auth/error` | same routes | replaced. The sign-in page has the Student and Teacher tabs (class code, name, and pictures; username and password); no Google sign-in (decision D8); no `?classroom_code=` prefill (`components/student-login/*`); no "session expired" notice. PUB-05, PUB-06, PUB-07; PUB-06 after the cutover. |
| (none) | `/auth/card` | new: QR card sign-in |
| (none) | `/b/[book]/[n]` | new: the short link that a QR code opens |
| `/~offline` | (none) | missing with the PWA. The manifest is commented out (`app/[locale]/layout.tsx:79`); no service worker and no icons; legacy has `app/manifest.ts`, `app/sw.ts`, `app/(offline)/~offline/page.tsx`. STU-13; `primary_parity_pwa_20261011`. |
| `/unauthorized`, the not-found page | same | same |
