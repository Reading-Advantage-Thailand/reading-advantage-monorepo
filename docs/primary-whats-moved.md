# Primary Advantage: what moved

The map from the legacy build to the new app, for the video and manual writers.

- Legacy build: `~/Desktop/primary-advantage` at commit `bfea121` (2026-08-10).
- New app: `apps/primary-advantage` on branch `primary/lane-f-reedy-preview` (2026-10-06).
- Labels are the navigation label or the page title, English / Thai, as the message files give them.
- Marks: **same** (the route and the job stay), **moved** (a new route), **renamed** (the same route, a new label), **merged** (the job lives inside another page), **removed** (no page; the note says what replaces it), **new** (no legacy page).

## How a student gets around

- Phone: the toolbar at the bottom has four tabs: Home, Read, Games, Me. The other pages open from the menu button (☰) at the top left.
- Desktop: the signpost at the left lists Home, Read, Games, Assignments, Sentences, Vocabulary, Reports, History, Me.
- Home is `/student/home`. The sign-in page sends a student there.

## Student pages

| Legacy page | New route | Label (English / Thai) | Tap path from home | Mark |
|---|---|---|---|---|
| (none) | `/student/home` | Home / หน้าหลัก | Toolbar: Home | new |
| `/student/read` | `/student/read` | Read / อ่าน | Toolbar: Read | same |
| `/student/read/[articleId]` | `/student/read/[articleId]` | story title | Read → a story card | same |
| `/student/lesson/[id]` | `/student/lesson/[id]` | Lesson / บทเรียน | Read → a story → "Study as 45-min Lesson"; or Home → "Keep reading" | same |
| `/student/stories`, `/student/stories/[storieId]`, `/student/stories/[storieId]/[chapterNum]` | (none) | Stories / เรื่องราว | — | removed. The new database has no stories and no story chapters (see `docs/deployment/primary-cutover-migration-spec.md`, the table list). Long texts arrive as stories on the Read list through the Workbooks injector. |
| `/student/goals` | `/student/quest/battle` and the Class Quest card on Home | Learning Goals (English only in the legacy build) → Class Quest / ภารกิจห้องเรียน | Home → Class Quest card → "Go to the battle" | merged. The weekly goals now belong to the Class Quest: reading days, accuracy, streak. Each met goal gives a power-up for the battle. |
| `/student/assignments` | `/student/assignments` | Assignments / งานที่กำหนด | Menu → Assignments | same |
| `/student/games` | `/student/games` | Games / เกม | Toolbar: Games | same route; the catalog is new: class challenges, rewards, the word adventures banner, word games, sentence games |
| `/student/games/vocabulary/dragon-rider`, `/enchanted-library`, `/rpg-battle`, `/rune-match`, `/student/games/sentences/potion-rush` | `/student/games/apk/[cartridgeId]` | the game title | Games → a game banner | moved. Every game is a cartridge of the play kit; the old per-game routes are gone. |
| (none) | `/student/games/story` | Word adventures / ผจญภัยคำศัพท์ | Games → "Word adventures" (the first banner) | new. 3D games with the student's saved words and sentences; a 2D mode for older phones. |
| `/student/history` | `/student/history` | History / ประวัติ (page: My reading / ประวัติการอ่าน) | Menu → History | same |
| `/student/reports` | `/student/reports` | Reports / รายงาน | Menu → Reports | same |
| `/student/sentences` | `/student/sentences` | Sentences / ประโยค (page: My sentences / ประโยคของฉัน) | Menu → Sentences | same |
| `/student/vocabulary` | `/student/vocabulary` | Vocabulary / คำศัพท์ (page: My words / คำศัพท์ของฉัน) | Menu → Vocabulary | same |
| `/settings/user-profile` | `/settings/user-profile` | Me / ฉัน (page: Personal information / ข้อมูลส่วนตัว); was User Profile / โปรไฟล์ผู้ใช้งาน | Toolbar: Me | renamed |
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
| `/teacher/dashboard` | `/teacher/dashboard` | Home / หน้าหลัก; was Teacher Dashboard / กระบวนการของครู | Sidebar: Home | renamed. The page shows My classes, Open assignments, Who needs help, and the Class Quest. |
| `/teacher/my-classes` | `/teacher/my-classes` | My Classes / ชั้นเรียนของฉัน | Sidebar: My Classes | same |
| `/teacher/my-students` | `/teacher/my-students` | My Students / นักเรียนของฉัน (All Students / นักเรียนทั้งหมด) | Sidebar: My Students → All Students | same. The reset-progress dialog stays here. |
| `/teacher/class-roster` | `/teacher/class-roster` | Class Roster / รายชื่อชั้นเรียน | Sidebar: My Students → Class Roster | same |
| `/teacher/class-roster/[classroomId]` | `/teacher/class-roster/[classroomId]` | Class Roster / ทะเบียนชั้นเรียน (the classroom tabs) | Class Roster → a class | same route; the page gained the tabs and the class book links |
| `/teacher/class-roster/[classroomId]/enrollment` | `/teacher/class-roster/[classroomId]/enrollment` | Student Enrollment / การลงทะเบียนนักเรียน | a class → "Enroll students" | same |
| `/teacher/assignments`, `/teacher/assignments/[id]` | same routes | Assignments / งานที่กำหนด | Sidebar: Assignments | same |
| `/teacher/reports` | `/teacher/reports` | Reports / รายงาน (Overview Reports / รายงานภาพรวม) | Sidebar: Reports | same |
| `/teacher/reports/[classroomId]` | `/teacher/class-roster/[classroomId]` (Reports tab) and `/teacher/class-roster/[classroomId]/books/[classBookId]/progress` | Reports / รายงาน; Class progress / ความก้าวหน้าของชั้นเรียน | a class → Reports tab; a class → the class book → "Class progress" | merged. The class detail dashboard is the Reports tab; the lesson-by-lesson view is the class progress page with the red ring for a student who needs help. |
| `/teacher/student-progress/[id]` | `/teacher/student-progress/[id]` | Student Progress / ความก้าวหน้าของนักเรียน | a class → a student | same |
| `/teacher/workbook-generate` | (none) | Workbook Generator / สร้างเวิร์กบุ๊ก | — | removed. Content arrives through the Workbooks injector, not through the app (`docs/deployment/primary-cutover-migration-spec.md`, change 1.1). The teacher reads the plan on the Lesson plan page and in the Teacher manual. |
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
| `/admin/dashboard` | `/admin/dashboard` | Dashboard / แดชบอร์ด (Admin Dashboard / แดชบอร์ดผู้ดูแลระบบ) | Sidebar: Dashboard | same |
| `/admin/dashboard/teachers`, `/admin/dashboard/students` | same routes | Teachers / ครู, Students / นักเรียน | Sidebar: Dashboard → Teachers, Students | same |
| `/admin/teachers`, `/admin/teachers/add` | same routes | Teachers / ครู (All Teachers, Add Teacher) | Sidebar: Teachers | same |
| `/admin/students`, `/admin/students/add`, `/admin/students/classrooms` | same routes | Students and Classes / นักเรียนและชั้นเรียน | Sidebar: Students and Classes | same |
| `/admin/import-data` | `/admin/import-data` | Import Data / นำเข้าข้อมูล | Sidebar: Import Data | same |
| `/admin/article-creation` | `/admin/article-creation` | Article Creation / การสร้างบทความ | Sidebar: Article Creation | same |
| (none) | `/admin` | the admin landing page with the quick actions | after sign-in | new |
| (none) | `/admin/reedy` | Reedy this month / รีดี้เดือนนี้ | the quick actions → Reedy | new |

## System pages

| Legacy page | New route | Label (English / Thai) | Mark |
|---|---|---|---|
| `/system/dashboard`, `/system/schools`, `/system/licenses`, `/system/licenses/create-licenses`, `/system/test` | same routes | System Dashboard / กระบวนการของระบบ, Schools Dashboard, Licenses Dashboard, Testing | same |
| `/system/ai-config` | (none) | AI Provider Config / การตั้งค่า AI Provider | removed. AI goes through the internal adapter; the provider comes from the environment, not from a page. |
| `/system/contact-messages` | (none) | Contact Messages / ข้อความติดต่อ | removed. |

## Public and sign-in pages

| Legacy page | New route | Mark |
|---|---|---|
| `/` , `/about`, `/authors`, `/contact`, `/privacy-policy`, `/terms` | same routes | same |
| `/auth/signin`, `/auth/signup`, `/auth/forgot-password`, `/auth/error` | same routes | same. The sign-in page now has the Student and Teacher tabs; a student types the class code first. |
| (none) | `/auth/card` | new: QR card sign-in |
| (none) | `/b/[book]/[n]` | new: the short link that a QR code opens |
| `/~offline` | (none) | removed (the offline page of the old service worker) |
| `/unauthorized`, the not-found page | same | same |
