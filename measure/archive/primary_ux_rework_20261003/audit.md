# Primary UX Audit (Phase 0)

Track: `primary_ux_rework_20261003` · Date: 2026-10-05 · Lane C

## Inputs and method

- Automatic data: `measure/qa/browser-2026-10-05/phase0/inventory.json`. It has 50 routes at 375, 768, and 1280 px. It records HTTP status, final path, page overflow, console errors, and axe serious/critical rules (1280 only).
- Screenshots: full-page PNG files from the same run. They are not in Git. The reviewer looked at 375 and 1280 for every student and teacher route, 1280 for public, admin, and system routes, and 768 for one route.
- The run used a local dev server and QA data. Local data has 3 articles, few questions, no article images (image requests return 403), and no assignments for the QA student.
- Dev-only items show in the captures: the Next.js "Issues" badge and the Roles panel on the profile page (`NODE_ENV === "development"`). This audit does not count them as defects.
- At 1280, three pages show only the loading state: class roster detail, assignment detail, and admin students. The audit uses the 375 capture for those pages.
- Every capture uses `/en`. This sweep did not capture Thai text.

### Severity

- **Broken**: the screen does not do its job, shows wrong data, or blocks a user (including keyboard users).
- **Confusing**: the screen works, but a user can misread it or cannot find the next step.
- **Ugly**: the screen works and is clear, but it looks unfinished or does not match the brand.

### Automatic findings (summary)

- All 50 routes return HTTP 200. Three routes redirect: `/` to `/en`, `/teacher/dashboard` to `/teacher/my-classes`, and `/admin` to `/admin/dashboard`.
- Page overflow is 0 px on all routes at all widths. **This number is not reliable.** `<main>` in `components/shared/app-layout.tsx` has `overflow-hidden`, so wide content is cut and not scrolled. The screenshots show cut tables and cards at 375 (see C8).
- axe (1280):
  - `aria-allowed-attr` (critical) shows on exactly the 39 signed-in routes. The cause is the shared shell (see C6).
  - `color-contrast` (serious) shows on the 45 routes that have the header logo text. The 5 routes without that header have no contrast finding (see C4).
  - `button-name` (critical) shows on 10 routes. `select-name` (critical) shows on 1 route.
- Console:
  - `MISSING_MESSAGE` for `Reports.activityType.SENTENCE_FLASHCARDS` and `Reports.level.description.A0-` (student reports and teacher student progress).
  - A hydration attribute mismatch on 5 page loads. The widths are random: `/` (375), student assignments (375), student history (768), admin students (1280), and admin add teacher (768).
  - "No questions found ... MC_QUESTION" on the article page. This error breaks the page (see S2).
  - 403 on the lesson and assignments pages (article images).
  - "Failed to fetch" lines come from the capture script. This audit ignores them.

Legend for the "Auto" column: AAA = aria-allowed-attr, BN = button-name, SN = select-name, CC = color-contrast, HM = hydration mismatch. The number is the count of nodes.

## 1. Problems per screen

### Shared shell (all 39 signed-in screens)

These problems show on every signed-in screen. The rows below do not repeat them.

| Broken | Confusing | Ugly | Auto |
|---|---|---|---|
| 1. Below 1024 px, the sidebar (and the leaderboard, for students) stacks above the content. On a 375 phone, student content starts at about 600 px. At 768, the same problem occurs.<br>2. The account menu trigger is the avatar `<span>`. A keyboard user cannot open it, so a keyboard user cannot sign out.<br>3. `<main>` cuts wide content at 375 (`overflow-hidden`). | 1. Two navigations: a top bar with public links (Home, About, Contact, Authors) and a role sidebar.<br>2. The mobile menu button opens only the public links.<br>3. Read, Games, and Vocabulary use the same book icon.<br>4. The settings pages drop the main nav and show two back links. | 1. Grayscale shadcn theme with black buttons.<br>2. Cyan logo text (`text-[#22d3ee]`) on white.<br>3. The font falls back to the system font (see C5).<br>4. Theme and locale icons have no visible labels. | AAA(1) on all 39 routes. CC(1) from the logo text. |

### Public

| Route | Broken | Confusing | Ugly | Auto |
|---|---|---|---|---|
| `/` (to `/en`) | — | 1. "Start your free trial" and "Get Started Now!" suggest self sign-up. The owner decision is "no self-service accounts".<br>2. The footer has a GitHub icon and "Features" and "Support" links. | 1. The hero is text only, with no image.<br>2. The headline uses an Arial-like font, but the body uses Noto Sans.<br>3. The navy theme does not match the app.<br>4. Feature card titles do not align. | BN(1), CC(1). HM at 375. |
| `/about` | — | The page has a title and a subtitle only. | Large empty area above the footer. | CC(1) |
| `/authors` | The page shows only the placeholder text "Authors Page". | — | — | CC(1) |
| `/contact` | — | The page has one line: "Daniel Bo: admin@…". The landing page has a full contact form, but this page does not. | — | CC(1) |
| `/privacy-policy` | — | The brand is "Reading Advantage". The date is February 23, 2025. The text mentions email and subscriptions. The owner must review the legal text. | Long lines of small text at 1280. | CC(1) |
| `/terms` | — | Same as the privacy policy. | Same as the privacy policy. | CC(1) |
| `/auth/signin` | — | 1. The sign-in screen has no locale toggle, so Thai students must read English.<br>2. "Sign in with username and password" looks like plain text. | 1. At 1280, the left half of the card is an empty dark gray panel.<br>2. The primary button is black.<br>3. At 375, the screen shows no logo or brand. | — |
| `/auth/card` | — | — | The same empty gray panel. The red error text has no icon. | — |
| `/auth/forgot-password` | The heading and the form sit side by side. At 1280, the input and the button go past the card edge. At 375, the heading wraps to 3 lines. | The form asks for an email. Students sign in by username and have no email. | — | — |
| `/auth/error` | — | The page shows unstyled text and no action. It has no "Back to sign in" button. | Plain text in the gray panel layout. | — |
| `/unauthorized` | — | — | No shell and no logo. "Back to home" is a small text link. | — |

### Student

| Route | Broken | Confusing | Ugly | Auto |
|---|---|---|---|---|
| S1 `/student/read` (current landing) | 1. Article images do not load. Each card is a black box, and the page has no fallback image.<br>2. The shell problem: at 375, the list starts below the first screen. | 1. "Please choose the Type you want to read" (capital T).<br>2. The page shows three level systems: "Your level is 1", "RA Level: 1", and "CEFR Level: A1-".<br>3. Every card shows 5 empty stars.<br>4. The Fiction and Nonfiction buttons are both black, so the active type is not clear. | 1. Red pill badges on black cards.<br>2. The cards have different heights, and the second card sits 8 px higher.<br>3. At 375, the "Go to top" button covers the type buttons. | AAA(1), CC(2) |
| S2 `/student/read/[id]` (article) | The page shows "Something went wrong" at all widths. `getQuestionsByArticleId` (`server/models/articleModel.ts:545`) throws when an article has no MC questions, and the throw replaces the whole article. A student cannot read the article. | "Try again" runs the same throw again. | At 375, the "Try again" label wraps to 2 lines. | AAA(1), CC(2). Console: "No questions found … MC_QUESTION" (2 lines). |
| S3 `/student/lesson/[id]` | 1. The article image fails (403). The page shows a broken-image icon with the alt text.<br>2. The CEFR Level and RA Level badges are empty ("CEFR Level :").<br>3. The 3 learning objectives end in ":" and have no text. | 1. The progress rail has 14 steps.<br>2. At 375, the rail moves below "Start Lesson" and collapses to "Current: Task 1".<br>3. "Estimated Read Time : 1" has no unit.<br>4. The "Learning Mode" chip looks like a button. | 1. Blue-to-purple gradient cards. No other screen uses this style.<br>2. Gray text on lavender has low contrast.<br>3. A gray card sits behind the article block. | AAA(1), CC(4). Console: 403. |
| S4 `/student/assignments` | At 375, the 7-column table is cut. The empty text "No assignments found" is cut. | 1. A 7-column data table (Created At, Assigned By, Link To Assignment) for students aged 8 to 12.<br>2. The empty state is one table row with no help text.<br>3. Previous and Next buttons show when the list is empty. | Native selects with no style. | AAA(1), **SN(2)**, CC(2). HM at 375. 403 at 375 and 768. |
| S5 `/student/vocabulary` | The page shows "Unable to Load Flashcard Data — Failed to fetch dashboard data" at all widths. `getDashboardData` (`actions/flashcard.ts:389`) goes to its catch block. A possible cause is ``sql`… = ANY(${activityTypeFilter})` ``, which sends a JS array into the Drizzle `sql` template. Check the server log to confirm. | 1. The tab bar has one tab ("Vocabulary Card").<br>2. Vocabulary and sentences use the same title, "Flashcard Dashboard".<br>3. The error box shows a raw technical message. | An orange title, a red error title, and a pink error box are all on one screen. | AAA(1), CC(3) |
| S6 `/student/sentences` | The same error as S5. | 1. Six tabs. At 375, the tabs stack into a 6-row list.<br>2. Students see a "Manage" tab. | Same as S5. | AAA(1), CC(3) |
| S7 `/student/games` | — | 1. The subtitle is developer text: "Play the live Advantage Play Kit catalog. Each card opens the authenticated APK route."<br>2. The page shows more than 30 cards with no images, no groups, and no filter.<br>3. Dragon Flight and Dragon Rider have the same description.<br>4. An expired challenge shows in "Class challenges".<br>5. Dates use the US format (9/14/2026). | 1. Cards are text only.<br>2. The navy "Wizard rewards" panel with a cyan frame does not match the white shell.<br>3. At 375, the page is 4,662 px tall. | AAA(1), CC(2) |
| S8 `/student/history` | "Reminder to read" lists one article, but "Article Records" shows "No articles found". The two lists do not agree. | 1. Column headers are lower case (title, score, date, rated, status).<br>2. The one row shows "N/A", "0", and "Unrated".<br>3. The loading state is the text "Loading…". | 1. Orange heading.<br>2. The two tables have different styles. | AAA(1), CC(2). HM at 768. |
| S9 `/student/reports` | 1. The raw key `Reports.level.description.A0-` shows below the level gauge.<br>2. At 375, the chart cards are wider than the screen, and `<main>` cuts their right edge. | 1. Three chart cards (XP Earned, XP Overall, Reading Stats Chart) are empty white boxes with no empty-state text.<br>2. The chart control has the label "Selected Type".<br>3. "Recent Activity" has a sort icon for one row. | 1. At 1280, about 1,000 px of the page is blank cards.<br>2. The gauge colors (green to red) do not match the brand. | AAA(1), BN(1), CC(7). MISSING_MESSAGE (2). |
| S10 `/settings/user-profile` (student) | — | 1. Two "Username" fields: one can be edited, one is read-only.<br>2. A "License" field for students.<br>3. Two back links: "Back" and "Back to Reading Page".<br>4. The student sidebar shows a "School Profile" link.<br>5. The text "used to represent themselves" has a grammar error. | The header changes: the main nav is not shown on settings pages. | AAA(1), CC(1) |

### Teacher

| Route | Broken | Confusing | Ugly | Auto |
|---|---|---|---|---|
| T1 `/teacher/dashboard` (to my-classes) | — | Teachers have no home screen or overview. After sign-in, a teacher sees a table. | — | AAA(1), CC(1) |
| T2 `/teacher/my-classes` | At 375, the toolbar breaks. The search box shrinks to a small stub, and "New Classroom" is cut at the right edge. The Grade and Actions columns are cut. | 1. "Class challenges" is plain text, so it does not look like a link.<br>2. "Import a new class from Google Classroom". The owner decision is "no Google sign-in anywhere", so the owner must confirm this import.<br>3. My Classes and Class Roster list the same classes in two layouts. | 1. A large empty area below a 2-row table.<br>2. The black Google button is the strongest element on the page. | AAA(1), CC(1) |
| T3 `/teacher/my-students` | CSS `capitalize` changes emails to "Qa-Student-A1@Qatest.Local". | 1. The "Email" column shows "Unknown" for most students, because students sign in by username.<br>2. The table has no class column.<br>3. At 375, the Actions column is cut. | — | AAA(1), CC(1) |
| T4 `/teacher/class-roster` | — | 1. The page shows the same data as My Classes, in cards.<br>2. "New Classroom" shows here and on My Classes. | The dates use the US format ("Created 10/5/2026"). | AAA(1), CC(1) |
| T5 `/teacher/class-roster/[id]` | 1. At 375, the sign-in table wraps student names to one part per line ("qa-", "student-", "a1"). The cards cut names to "qa-st…".<br>2. The remove-student icon buttons have no accessible name. | 1. The page has two student lists: "Students" in Class sign-in and "Students List".<br>2. A number "0" below the level badge has no label.<br>3. A red remove-student button sits next to the kebab menu. | At 1280 and 768, the capture shows only the skeleton and the text "Loading class sign-in…". | AAA(1), **BN(3)**, CC(1) |
| T6 `…/[id]/class-sheet` | — | "Make class sheet" resets the password of every student and signs them out. The button has the normal primary style, not a danger style. The capture shows no confirmation step. | "Back to class" is a small underlined link that touches the heading. | AAA(1), CC(1) |
| T7 `…/[id]/qr-cards` | — | The Print button is disabled and has no hint. | Same layout as T6. | AAA(1), CC(1) |
| T8 `…/[id]/enrollment` | At 375, the remove-student buttons sit outside the card edge. The buttons have no accessible name. | 1. The heading "Student Enrollment" shows twice.<br>2. The search placeholder says "by name or email", and the cards show emails. | — | AAA(1), **BN(3)**, CC(1) |
| T9 `/teacher/assignments` | At 375, the table and the empty text are cut. "Page 1 of 1" wraps to 4 lines. | 1. The list stays empty until the teacher selects a class. The page has no default class and no "all classes" option.<br>2. The page has no "Create assignment" action. | — | AAA(1), BN(1), CC(1) |
| T10 `/teacher/assignments/[id]` | The due date shows "January 1, 1970 at 08:00 AM". The page shows an empty date as the epoch date. The status chip says "Overdue". | 1. The title shows the article name and the assignment name with no labels.<br>2. All 5 stat cards show 0.<br>3. At 375, the status filter tabs are cut ("Ove…"). | At 375, 5 full-width stat cards push the student list down by about 600 px. | AAA(1), CC(4) |
| T11 `/teacher/reports` | — | 1. The "Reports" menu opens to one sub-item ("Overview Reports").<br>2. The page shows one long list of 28 students with no class groups, no sort, and no pages.<br>3. The rows show the email below the name. | At 375, 4 stat cards stack at full width. | AAA(1), BN(1), CC(3) |
| T12 `/teacher/student-progress/[id]` | The same problems as S9: the raw key `Reports.level.description.A0-`, empty chart cards, and a cut right edge at 375. | 1. The teacher sees "Your Level : A0-", which is text for the student.<br>2. The page has no back link to the class.<br>3. No sidebar item is active. | Same as S9. | AAA(1), BN(1), CC(6). MISSING_MESSAGE (2). |
| T13 `/teacher/game-challenges` | 1. The text inputs are not visible: dark fill on a dark panel, with no border.<br>2. The class select is empty, and the text "Loading classes…" shows. | 1. The sidebar has no link to this page. The only link is plain text on My Classes.<br>2. "Back to classes" is plain text.<br>3. The date inputs show mm/dd/yyyy. | A teacher form in the game style (navy with a cyan frame) inside the white teacher shell. | AAA(1), CC(1) |

### Admin (school admin)

| Route | Broken | Confusing | Ugly | Auto |
|---|---|---|---|---|
| A1 `/admin/dashboard` (and `/admin`) | 1. Demo numbers show as real data: "327" weekly active users, "187" articles, and "+12% from last week".<br>2. Three cards say "Data unavailable" and show developer text: "Live count wiring pending the multi-tenant scoping track". | 1. The subtitle is the placeholder "Admin Dashboard Description".<br>2. The sidebar nests "Admin" below "Dashboard". | 1. The charts have data for Monday only.<br>2. "Class Engagement Metrics" is an empty chart. | AAA(1), CC(5) |
| A2 `/admin/dashboard/students` | The page is blank except for the word "Students". | — | — | AAA(1), CC(2) |
| A3 `/admin/dashboard/teachers` | The page shows a title and a subtitle, but no content. | — | — | AAA(1), CC(2) |
| A4 `/admin/students` | — | The filter placeholder is cut ("Filter by classro"). The capture shows the loading state. | Spinners in the 4 stat cards. | AAA(1), BN(2), CC(2). HM at 1280. |
| A5 `/admin/students/add` | — | The form asks for a full name and an email only. It has no username field, no password field, and no class field, but sign-in is by username. | — | AAA(1), CC(2) |
| A6 `/admin/students/classrooms` | — | — | Black class-code pills. | AAA(1), CC(2) |
| A7 `/admin/teachers` | — | 1. The "Role" column is empty.<br>2. The last column header is cut ("Ac"). | — | AAA(1), CC(2) |
| A8 `/admin/teachers/add` | — | The form has an email field but no username field. | — | AAA(1), BN(2) (password show buttons), CC(2). HM at 768. |
| A9 `/admin/import-data` | — | The CSV format needs an email column. The example data uses "john.doe@email.com". | — | AAA(1), CC(2) |
| A10 `/admin/article-creation` | — | The sidebar shows "Article Creation" as locked (gray, with a lock icon), but the page opens. | — | AAA(1), **BN(3)**, CC(2) |
| A11 `/settings/school-profile` | — | 1. A red "Delete" school button sits next to "Edit School".<br>2. "Total Admins: 0" shows while an admin looks at the page.<br>3. The page shows "No license found". | — | AAA(1), CC(1) |

### System

| Route | Broken | Confusing | Ugly | Auto |
|---|---|---|---|---|
| Y1 `/system/dashboard` | The page is empty. It shows only the placeholder "System Dashboard Description". | The sidebar has a "Testing" item. | — | AAA(1), CC(1) |
| Y2 `/system/licenses` | — | The subtitle "Create a new license for school" is on a list page. | — | AAA(1), CC(2) |
| Y3 `/system/licenses/create-licenses` | — | — | The form uses half of the width. The two columns do not align. | AAA(1), CC(1) |
| Y4 `/system/schools` | The page shows no school list and no empty-state text. This can be a slow load, so check it again. | — | — | AAA(1), CC(1) |

## 2. Cross-cutting problems

| ID | Problem | Where | FR |
|---|---|---|---|
| C1 | **Two navigations.** Signed-in screens show the public links (`sharedMainNav`: Home, About, Contact, Authors) in the top bar and a role sidebar below. A student who selects "About" goes to the marketing site. `new-main-nav.tsx` and `new-mobile-nav.tsx` are used only by `site-header.tsx`. `(index)/layout.tsx` imports `site-header.tsx` but does not render it. | All signed-in screens; `components/nav/*`, `components/shared/app-layout.tsx` | FR-3 |
| C2 | **No mobile navigation.** The sidebar changes to a column only at `lg` (1024 px). Below 1024 px, it stacks above the content. Tablets in portrait (768) have the same problem. The mobile menu button opens the public links only. | All signed-in screens at 375 and 768 | FR-3, FR-10 |
| C3 | **Leaderboard in the sidebar.** The leaderboard shows on every student screen and pushes content down on phones. With one student, it shows "You" in green (low contrast). | All student screens | FR-4 (move it to home or Me) |
| C4 | **Theme.** The app uses the grayscale shadcn theme with a black `--primary`. The cyan logo text `#22d3ee` on white has a contrast ratio of about 1.8:1. This node is the one `color-contrast` finding on 45 routes. The app has 5 visual styles: grayscale shell, blue-purple lesson, orange flashcards, navy-cyan games, and navy landing. | Global; `styles/globals.css`, `main-nav.tsx` | FR-1, FR-7 |
| C5 | **Fonts.** `next/font` loads Inter, but `@theme inline` sets `--font-sans: var(--font-geist-sans)`, and that variable is not defined. The text falls back to the system font (Noto Sans in the captures), so the font changes on each device. The landing headline uses an Arial-like font. The app loads "Winky Rough", "Cabin Sketch", and "Quicksand" with a Google Fonts `@import`. The app loads no Thai font. | Global | FR-1 |
| C6 | **Keyboard and ARIA.** `UserAvatar` (a Radix Avatar `<span>`) is the `DropdownMenuTrigger asChild` in `user-account-nav.tsx`. Radix adds `aria-expanded` to a span, so axe reports `aria-allowed-attr` on all 39 signed-in routes. The span cannot get focus, so a keyboard user cannot sign out. Icon-only buttons have no names (remove student, show password). Selects have no labels. Screen reader labels are English only ("Toggle Locale", "Toggle theme"). The sidebar tooltip "You don't have permission…" is English only. The app has no skip link. | Shell and 10 routes | FR-7, FR-8 |
| C7 | **Contrast.** 45 routes fail. Known nodes: the cyan logo, the green "You", gray text on the lesson gradients, and gray text on navy. | Global | FR-7, FR-1 |
| C8 | **Hidden clipping.** `<main className="… overflow-hidden">` cuts wide content, so the overflow check reports 0 px. At 375, the screens with cut content are student assignments, my-classes, my-students, teacher assignments, assignment detail, student reports, and student progress. Data tables are the default list pattern for students and for teachers on phones. | Shell, all list screens | FR-10, FR-5, FR-6 |
| C9 | **Empty states.** Empty states are a bare table row ("No assignments found"), blank chart cards, or blank admin pages. They have no next action. | S4, S8, S9, T9, T12, A2, A3, Y1, Y4 | FR-5, Phase 4 |
| C10 | **Loading states.** The app uses three loading patterns: plain "Loading…" text (history, game challenges, class sign-in), spinners (admin), and skeletons (roster detail, assignment detail). | Many | FR-2 (shimmer skeleton), FR-5 |
| C11 | **Error states.** The article page throws to the error boundary. The flashcard pages show a raw technical error. The reports show raw i18n keys. | S2, S5, S6, S9, T12 | FR-5, FR-8 |
| C12 | **i18n and Thai.** The default locale is `en`. The sign-in screen has no locale toggle. Two message keys are missing. Dates use the US format (M/D/YYYY, mm/dd/yyyy). Developer copy is English only. This sweep has no Thai captures. | Global | FR-8, FR-1 (Thai-first font stack) |
| C13 | **Email copy and the username-only rule.** Forgot password asks for an email. The "Email" columns show "Unknown". The add-student and add-teacher forms ask for an email. The CSV import needs an email column. The owner rule is "keep account paths working, add no features". Lane C can change labels and copy only. | Auth, teacher, admin screens | FR-6, FR-8 (owner check) |
| C14 | **Developer and placeholder copy.** Examples: "Admin Dashboard Description", "System Dashboard Description", "Authors Page", "authenticated APK route", "Live count wiring pending…", and demo admin numbers that look real. | Public, games, admin, system | FR-5, FR-6, FR-11 (same cleanup type as the README) |
| C15 | **Settings layout.** The settings layout drops the main nav and changes the header. The settings pages have two back links. | `/settings/*` | FR-3 |
| C16 | **Game look and shell.** The games page and the game challenges page use navy with a cyan frame. The shell is white and gray. The FR-1 goal is to keep the RPG look in game areas and make the shell match it. | S7, T13 | FR-1 |
| C17 | **Images.** Article images fail locally (403). The read list shows black boxes, and the lesson shows a broken-image icon. The app has no fallback image. | S1, S3 | FR-5 |
| C18 | **Floating "Go to top" button.** At 375, the button covers content on the read list. | S1 | FR-10 |
| C19 | **Hydration mismatch.** The mismatch occurs on 5 page loads at random widths. A possible cause is a relative time or a locale-formatted value that the server and the client render differently. | `/`, S4, S8, A4, A8 | Phase 4 quality |
| C20 | **Dark mode, motion, and sound.** This sweep did not capture dark mode, but the header has a theme toggle. The app has no motion system and no sound system. | Global | FR-1 (`.dark` block), FR-7 (reduced motion), FR-9 |

## 3. Screen order for Phases 2 and 3

Students come first, in order of traffic. Teachers come next. Admin, system, and public pages get the new shell only. This track does not redesign them.

| # | Screen | Reason |
|---|---|---|
| 1 | Sign-in (`/auth/signin`, `/auth/card`) | Every session starts here. It needs the brand, a locale toggle, and Thai text. Lane B owns the login logic, and Lane C owns the look. |
| 2 | Student home (new, FR-4) | It becomes the default landing page. It replaces `/student/read` as `STUDENT_HOME`. |
| 3 | Read list (`/student/read`) | It is the current landing page and the most-used list. |
| 4 | Article (`/student/read/[id]`) | It is the core reading screen. It is Broken today (S2). Fix the throw before the redesign. |
| 5 | Lesson (`/student/lesson/[id]`) | It is the class-book flow. It needs the progress rail and Tutor parity. |
| 6 | Assignments (`/student/assignments`) | Teachers send students here. Replace the data table with cards. |
| 7 | Vocabulary and sentences | Students use them for daily practice. They are Broken today (S5, S6). Fix the data error first. |
| 8 | Games catalog (`/student/games`) | Students like this screen. It is the anchor for the RPG look (C16). |
| 9 | History and reports | Students use them less often, and the screens are read-only. They share components with teacher student progress. |
| 10 | Profile (`/settings/user-profile`) | It becomes the "Me" tab. |
| 11 | Teacher shell and dashboard (new) | Teachers have no home today (T1). |
| 12 | My classes, class roster, and roster detail | Teachers use the class sign-in on every lesson. Merge the two class lists into one. |
| 13 | Teacher assignments and assignment detail | They are the main teacher task after class setup. Fix the epoch date. |
| 14 | Teacher reports and student progress | They need the shared report components from step 9. The teacher-books track owns the content. |
| 15 | Enrollment, class sheet, QR cards, game challenges | Teachers use them less often. They need the shared form, danger-action, and print styles. |

## 4. Quick wins and risks

### Quick wins

1. Make the account menu trigger a real `<button>` that wraps the avatar. This one change fixes `aria-allowed-attr` on 39 routes and gives keyboard users a way to sign out. The file is owned by Lane C.
2. Fix the `--font-sans` mapping in `styles/globals.css` (FR-1, Phase 1).
3. Change the logo text color to a brand token that passes AA. This change removes one contrast node from 45 routes.
4. Add the 2 missing `en` keys (and the `th` keys): `Reports.activityType.SENTENCE_FLASHCARDS` and `Reports.level.description.A0-`.
5. Remove `capitalize` from email and username cells (T3).
6. Show "No due date" when the due date is empty, not the epoch date and "Overdue" (T10).
7. Give names to icon-only buttons (remove student, show password) and labels to the selects (S4, T5, T8, A8).
8. Remove developer and placeholder copy (S7 subtitle, A1, Y1, `/authors`).
9. Send the two data bugs to the coordinator, because they are outside Lane C files:
   - S2: `getQuestionsByArticleId` must not throw for the article page (`server/models/articleModel.ts:545`).
   - S5 and S6: `getDashboardData` fails (`actions/flashcard.ts:389`). Check the `ANY(${array})` SQL.

### Risks

1. **FR-2 codemod size.** The app has 33 local files in `components/ui`. 142 non-test files import `@/components/ui/*`. No files import `@reading-advantage/ui`. `packages/ui` has 15 components with the same names as local files (alert, alert-dialog, avatar, badge, button, card, checkbox, dialog, input, label, progress, separator, skeleton, tabs, tooltip). If Lane C deletes the local copies, most screens change in one commit, and the commit can conflict with other lanes. Do the codemod early, in one commit, and tell the other lanes before the merge.
2. **Data bugs block QA.** S2, S5, and S6 are Broken because of server code that Lane C does not own. The redesign of these screens cannot pass vision QA until another lane fixes them.
3. **Thin local data.** Local data has 3 articles, few questions, no images, and no student assignments. Vision QA cannot judge real content. The Phase 4 sweep needs richer seed data or staging data.
4. **Capture timing.** Three pages showed only the loading state at 1280. The gate sweep must wait for network idle and for a content selector.
5. **Overflow check gap.** Because `<main>` has `overflow-hidden`, the current check cannot find cut content. The gate check must also test elements (for example `scrollWidth > clientWidth` on tables and cards). Alternatively, remove `overflow-hidden` from `<main>`.
6. **Tutor faults.** Do not copy these faults:
   - Tutor `--brand-500` `#06c755` with white text has a contrast ratio of about 2.3:1, which fails AA. Use `--brand-700` `#047d36` (about 5.3:1) for primary buttons and text on white.
   - Tutor `--primary` is neutral black.
   - Tutor tertiary text has low contrast.
   - Tutor aria labels are English only.
   - The Tutor manifest color is indigo.
7. **Owner rules on accounts.** The email fields conflict with the username-only rule, but new account features are not allowed (C13). Lane C changes labels only. The owner must decide about the Google Classroom import (T2).
8. **Dev-only items in captures.** The Roles panel and the Next.js badge show in dev mode. Run the gate sweep on a production build.
9. **Default locale.** The default locale is `en`, but the product is Thai-first. A change of the default changes routes and links, so the owner must decide.
10. **Shared screens.** The teacher-books track owns the content of the book and progress screens (FR-6). Agree on file ownership before Phase 3.
