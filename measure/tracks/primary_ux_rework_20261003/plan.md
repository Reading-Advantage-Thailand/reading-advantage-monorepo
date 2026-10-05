# Plan — Primary UX Rework

Owner lane: C. Edits to `globals.css`, nav, and `packages/ui` belong to this lane only.
Other lanes request changes here and do not edit these files.
From 2026-10-05 the reader (`components/articles`), `audio-button.tsx`, `hooks/useAudioSegment.ts`,
`components/flashcards`, `components/practice`, `actions/flashcard.ts`, and `components/lesson/task`
belong to Lane G (`primary_core_interaction_quality_20261005`). Lane C Phase 4 requests changes
there (i18n keys, states) instead of editing. `lesson-step-rail.tsx` and `lesson-progress-bar.tsx`
stay with Lane C. The Phase 2 open items on the flashcard streak, "cards studied today", the deck
toasts, and the play-kit panel text move to Lane G.

## Phase 0: Screen inventory and audit (2 h) — done in `7d4905521`
- [x] List every route with a screenshot at 375/768/1280 (agents, vision review) — 50 routes in `measure/qa/browser-2026-10-05/phase0/inventory.json`; PNGs kept out of Git
- [x] Rank problems per screen: broken, confusing, ugly — see [audit.md](audit.md) sections 1-2
- [x] Choose the order of screens by student traffic — see [audit.md](audit.md) section 3

## Phase 1: Foundation — done in `35a7c5b0f`..`df21a293e`
- [x] Tokens and fonts (FR-1) — `35a7c5b0f`
- [x] `packages/ui` additions and the codemod for overlapping components (FR-2) — `7590d9807`
  - New package exports: Button `glow` variant, `StatusChip` (+ `statusChipVariants`), `ShimmerSkeleton`, `cardHoverClassName`, `PageTransition`, `AnimatedCounter`.
  - Replaced with `@reading-advantage/ui` (local file deleted): alert, avatar, checkbox, label, separator, skeleton. (alert-dialog was replaced, then restored locally in Phase 2a; see below.)
  - Accepted look changes of the replaced files (Phase 2a, review L2):
    - alert: the icon sits at the top left (absolute), not in a grid column; the default fill is `bg-background` (was `bg-card`); the destructive variant gets a red border (was a card fill with red text); the title does not clamp to one line.
    - avatar: the default size is 40 px (was 32 px) where the call site sets no size.
    - checkbox: the border is the brand primary (was the input gray), `rounded-sm`, a 1 px focus ring (was 3 px); no `aria-invalid` red style and no dark-mode input fill.
    - label: no `flex gap-2` (an icon inside a label touches the text), disabled opacity 70 % (was 50 %), text can be selected.
    - separator: no visible change (1 px, border color).
    - skeleton: the fill is `bg-primary/10` (a light green tint) instead of the gray `bg-accent`.
    - alert-dialog: the package version is edge to edge with square corners below 640 px and has a light blurred overlay. Restored locally (M3).
  - Kept local (API differs; full replacement is the Semester 2 `primary_package_alignment` track):
    - alert-dialog (restored in Phase 2a, M3): at 375 px the package dialog has no side margin and no rounded corners. The local copy keeps `max-w-[calc(100%-2rem)] rounded-lg` and the `bg-black/50` overlay. The package default is not changed (other apps use it).
    - badge: `active`/`inactive`/`expired` variants in use (license table, article creation).
    - button: `accept`/`reject` variants in use (article creation).
    - card: `CardAction` export and a different padding model (`py-6` card, `px-6` parts) that 61 files rely on.
    - dialog: `closeButtonShow` prop in use (assign button).
    - input: forms rely on the `aria-invalid` error style; local `text-base` below `md` stops iOS zoom on focus.
    - progress: package indicator is fixed `neutral-900` and `h-4`; local bars use the brand primary and `h-2`.
    - tabs: local trigger is `flex-1` with an icon gap; the sign-in tabs rely on it.
    - tooltip: local `Tooltip` adds its own provider; `copy-button` uses it without a provider (the package `Tooltip` needs one).
- [x] Navigation (FR-3) — `d359ee876`
  - Bottom bar below 1024 px (glass, safe-area insets); sidebar from 1024 px. A menu button opens the full area menu in a sheet on phones, so pages that are not tabs stay reachable.
  - Student Home points to `STUDENT_HOME` (`/student/read`) until Phase 2 adds `/student/home`; Read wins the tie, so one tab is active. Teacher Home points to `/teacher/dashboard` (redirects to My Classes) until Phase 3.
  - Settings pages show the role navigation; School Profile shows only with `SCHOOL_ADMIN_ACCESS`.
  - The leaderboard sits below the page content (all widths) until Phase 2 moves it to the student home.
- [x] Page shell, skip link, landmarks (FR-7 base) — `df21a293e`
  - Open for Phase 3/4: `button-name` nodes on page-level icon buttons (admin students delete, roster and enrollment remove, add-teacher show password, article creation). The one-node `button-name` on `/`, student reports, teacher assignments, teacher reports, and student progress did not trace to a shell or shared component in a static review; it needs a browser axe run with selectors.

### Phase 1 decisions (coordinator, after the Phase 0 audit)
- Primary color is brand-700 `#047d36` for buttons and text on white (5.3:1). Tutor brand-500 `#06c755` is for large decorative fills only. The cyan logo text (1.8:1) uses `text-primary`.
- `--font-sans` is a Thai-first `next/font` stack: Noto Sans Thai (Thai subset), then Inter. Quicksand (articles) and Cabin Sketch (logo) also load through `next/font`.
- The account menu trigger becomes a real `<button>` with an accessible name.
- Below 1024 px the bottom bar replaces the stacked sidebar. The leaderboard leaves the nav column.
- `<main>` loses `overflow-hidden`; wide tables scroll in their own container.
- Not in Phase 1: the article-page and flashcard data bugs (Phase 2). Owner items: Google Classroom import, default locale `en`, email fields (labels only).

## Phase 2: Student
Run 2a (tasks 0-3) is done in `4ba0ab362`..`01fa69a03`. Run 2b owns the last item.
- [x] Phase 1 review fixes (run 2a, task 0) — `4ba0ab362`
  - M1: one `--bottom-nav-h` token (`--bottom-nav-row` 3.5rem + `--safe-bottom`) sets the bottom bar height and the content bottom padding, lifts the go-to-top button (`lg:bottom-4`), and lifts toasts (`mobileOffset`, plus `--toast-offset-bottom` for 600-1023 px tablets; 24 px from 1024 px).
  - M2: `--font-sans` is Inter, then Noto Sans Thai.
  - M4: `@reading-advantage/ui/client` (tsup banner `"use client"`) serves `AnimatedCounter`; the root entry keeps every export from before Phase 1 plus the server-safe Phase 1 parts; `cardHoverClassName` is in `src/lib/card-hover.ts`. No other package component uses hooks (the Radix wrappers get `"use client"` from Radix).
  - M5: audio bar translation text is `text-primary-foreground` (`dark:text-primary`); the bar sits on top of the bottom nav below 1024 px.
  - L1 `viewport.viewportFit = "cover"`; L4 transitions name `translate`/`scale`/`box-shadow`; L5 `STUDENT_HOME` is in `lib/student-home.ts`; L6 not-found `main` without `overflow-hidden`, the phone menu closes on any link tap, `GoToTop` jumps without smooth scroll for reduced motion.
- [x] Student home (FR-4) — `b1cfb2900` (gate fix `01fa69a03`)
  - Route `/student/home` (`app/[locale]/(student)/student/home`). `STUDENT_HOME = "/student/home"` (`lib/student-home.ts`) is the student role home in `lib/route-policies.ts` (`roleDefaultRedirects.student`, used by `proxy.ts` after sign-in), the Lane B sign-in redirect (`useEnterAfterSignIn`, password sign-in), the account-menu "Student dashboard" link, and the Home tab. Read stays `/student/read`.
  - Data: `getStudentHome` in `@reading-advantage/domain/primary-home` (own rows only, every query filters the signed-in student; tables reached through `tenantDb.unscoped`). XP, level, CEFR from `users`. Leaderboard: the existing `getSchoolLeaderboardController`; it left the shell (`AppLayout` has no leaderboard and no `disableLeaderboard` prop now). A leaderboard failure hides only the leaderboard.
  - Streak (decision): consecutive calendar days with any `user_activity` row in the last 366 days, ending today or yesterday (`countStreakDays`, moved from `lib/streak.ts` to the domain package; the flashcard dashboard uses the same function). Days are calendar days in Asia/Bangkok (changed in the Phase 2 review fixes; it was the server time zone, UTC on Cloud Run). No stored streak.
  - Today's lesson (default, spec FR-4 and the program): the class book data comes from Lane D+E. Until then the card shows the next open assignment (not completed; earliest due date first, no due date last) and links to `/student/lesson/<assignmentId>`. With no open assignment the card is hidden.
  - Continue reading: the newest `ARTICLE_READ` activity whose article is not finished (finished = multiple-choice, short-answer, and long-answer all done in `article_activity_logs`). With none, an empty state links to `/student/read`.
  - Reedy meter: `components/student/reedy-meter-slot.tsx` renders nothing until Lane F fills it.
  - New package parts: `EmptyState` and `ErrorState` (root entry, server-safe).
  - The flashcard action imports `countStreakDays` from `@reading-advantage/domain/primary-home/streak` (`01fa69a03`). The `./primary-home` entry loads the tenant registry, which needs every table at import time.
- [x] Read list and article view — `07526fcf8` (crash), `064c7f1c9` (redesign)
  - Crash (audit S2): `getQuestionsByArticleId` threw "No questions found" for an article without MC (or SA, LA) questions; the question cards are server components, so the throw reached the route error boundary and replaced the whole article. Fix: the loader returns `QuestionState.EMPTY` (new enum value) and the card shows a short note; `loadQuestions` turns any other load failure into the card ERROR state with a retry. A missing article throws `ArticleNotFoundError`, and the page shows a not-found state with a link back to the stories.
  - Read list: one level system for students (CEFR chip; the RA badge and the empty stars are gone), filter steps type, then genre, then topic (chosen steps are filled chips with `aria-current`, the next choices are outlined, 48 px), cards are white with the picture on top and a book fallback when the picture fails (the 403 black boxes), the title is a real link that covers the card, and "Study as a lesson" is a second link.
  - States: `loading.tsx` shimmer skeletons for the read list and the article; read-list empty state with "Show all" for a filter; load-more error with a retry; `error.tsx` for the read list and the article with a retry (`RouteError`: `router.refresh()` plus the boundary reset) and a back link. The student group error page links to the student home (was `/`).
  - Article view: CEFR chip and a "saved to flashcards" chip only when saved; the lesson link is a link (it was a button inside a link); the disclaimer is shorter and in en and th. `ArticleContent` (reader, audio, translation) is unchanged apart from M5.
  - Decision: the old `NEXT_NOT_FOUND` branch in the article `error.tsx` never ran (Next sends `notFound()` to not-found pages, not to `error.tsx`); it is replaced by the page-level not-found state, and its test is replaced.
  - Decision: the showcase card has no lesson toggle button now; the old toggle test in `components/__tests__/structural-alignment.test.ts` checks the two real links instead (`01fa69a03`). The `Article.showLessonOption`/`hideLessonOption` keys have no user now and stay for the Phase 4 i18n pass.
- [x] Lesson flow shell (steps shown as a progress rail) — `dec9d6445`
  - `components/lesson/lesson-step-rail.tsx`: the open step ("Step 3 of 14: First Reading"), the timer (rendered once), a segmented `role="progressbar"`, and the full step list with `aria-current="step"`. It is the first element of the lesson grid, so at 375 px it sits above the task (audit: the rail was below "Start Lesson" and collapsed); the list opens with a 48 px toggle below 1280 px and is always open in the 1280 px sidebar.
  - States: shimmer while a step loads; a failed step save (start or next) shows an error with a retry below the task (before, it only logged); `lesson/[id]/loading.tsx` and `error.tsx` (`RouteError`); a lesson without an article shows a not-found state.
  - Look: the blue-purple gradients, the "Learning Mode" chip, and the gradient buttons are gone; the header uses `bg-brand-50` with the article title as the `h1`; the buttons are the brand primary and outline, 48 px. Task components (activity internals) are unchanged (non-goal); the audit's empty CEFR/RA badges and objectives in the introduction task stay for the teacher/lesson track.
- [x] Games catalog, vocabulary, sentences, history, reports, assignments (run 2b) — `c50f681d7` (assignments), `85ccd7598` (vocabulary and sentences), `57fd0cfa5` (games), `99342d02a` (assignment list loading fix), `54ff1de89` (history), `c3e31b370` (reports)
  - Every screen has a shimmer loading page (`loading.tsx`), an empty state, and an error with a retry (inline and `error.tsx` with `RouteError`). New copy is in en and th; vi, cn, and tw get the English text.
  - Assignments, data (audit T10): `assignments.due_date` is nullable, and the teacher views rendered `new Date(null)` (1 January 1970, 08:00 at UTC+8) and counted every student as overdue. `getDueDateStatus` in `@reading-advantage/domain/assignments/due-date` (a pure entry, safe for client components) reads a null or invalid date as "none". Days are calendar days in Asia/Bangkok (changed in the Phase 2 review fixes; it was the local time zone of the caller). The teacher assignment page and list get only this fix (their redesign is Phase 3).
  - Assignments, screen: cards replace the 7-column table (status and due chips, the due date, the teacher, a 48 px lesson link). Status filter chips, a labelled due-date select, and search. The detail dialog is gone, because the cards show every field. Tests replaced: `student-assignment-table-messages.test.tsx` (deleted; `components/student/__tests__/assignment-list.test.tsx` covers it), the student-assignment case of the DataTable shell test (removed), and the dialog case of the loading-state test (now a card case). The `Assignment.studentAssignmentTable` keys have no user now and stay for the Phase 4 i18n pass.
  - Vocabulary and sentences, data (audit S5/S6): `getDashboardData` used ``sql`… = ANY(${array})` ``. Drizzle expands a JS array to a list, so Postgres got `= ANY(($1))` and failed with 22P02 "malformed array literal" (one type) or 42809 (two types); confirmed on the local Postgres. The filters use `inArray`.
  - Vocabulary and sentences, screen: own titles ("My words", "My sentences"), no one-tab bar, one row of 48 px practice tabs that scrolls sideways on phones. The local `dashboard-retry-button` and `empty-deck` files are deleted (shared `RetryButton` and `EmptyState`). Default kept: the "Manage" tab stays (students manage their own cards; a removal needs an owner decision). The deck view and the practice activities are unchanged (its English toasts stay for Phase 4).
  - Games: the catalog groups the games into word games and sentence games by `inputMode` (a game that is not a sentence game goes to the word games). The page and its states are in a `(catalog)` route group, so the game route `apk/[cartridgeId]` does not get the catalog skeleton or error page. Open (not Lane C files): the expired challenge, the US date format, and the English text inside the play-kit panels (`StudentChallengeCatalogPanel`, `StudentRpgCatalogPanel`); the same description for Dragon Flight and Dragon Rider (catalog data in `game-cartridges`).
  - History, data (audit S8): `/api/users/[id]/article-records` returned `fetchUserActivity` (activity, XP logs, and the full `users` row with the password hash column) instead of the article records, so "Article Records" was empty next to a filled reminder list. The route returns `fetchUserArticleRecords` now (page, limit, search parsed by Zod). The search filtered activities on `details->>'title'`, which `ARTICLE_READ` rows do not have; it matches the article title only now.
  - History, screen: "Read again" and "Stories I read" as story card links with child-friendly status chips, the quiz score, and the date. Decision: the "rated" column is gone (it was the average rating of the article, not the student's rating). Tests replaced: the history case of the DataTable shell test (removed); the keyboard row test checks a native link.
  - Reports, data (audit S9/T12): `Reports.activityType` had 4 of 17 types and `Reports.level.description` had no `A0-`/`A0+`. All keys exist now in 5 locales (a data test pins them); an unknown type or level shows readable words or nothing. Empty charts show empty-state text; the chart control is "Group by". `ReportPanels` is the shared grid for the student reports and the teacher student-progress page: the chart column spanned 2 columns of a 1-column grid, which cut the right edge at 375 px. Open for Phase 3: the English heading "Progress for …" and the "Your Level" text on the teacher page. Open for Phase 4: the one `button-name` node on student reports (needs a browser axe run).

### Phase 2 review fixes — `6c5635d71`..`7e528e591`
- [x] 1 (High) Teacher per-student report — `6c5635d71`. New `/api/users/[id]/activity` returns only `{ activity, xpLogs }` (same checks as `article-records`: the user, same-school staff, or SYSTEM). The view reads it, turns the JSON dates into Date objects (the recent-activity list called `getTime()` on a string, so a filled list crashed before run 2b too), and uses `ReportPanels`.
- [x] 2 (Medium) Due dates — `1fb2fc0bc`. `getDueDateStatus` compares calendar days: "overdue" only after the due day, "today" on the whole due day. The student home chip and the student due filter (`getStudentAssignments`: Late / Due today / Coming up, now disjoint) use it; the teacher counts already did. New pure entry `@reading-advantage/domain/calendar-day` (`SCHOOL_TIME_ZONE`, `calendarDayKey`, `calendarDayNumber`, `dayKeyNumber`).
  - Default (decision, no owner input needed): the time zone is `Asia/Bangkok` for calendar days and for date text. Source: the product serves Thai schools, and the student session policy in `packages/auth` (`schoolDayEnd`) already uses Asia/Bangkok. next-intl gets it in `i18n/request.ts` and on `NextIntlClientProvider`; the teacher due-date text (`toLocaleDateString`) sets it too. The test render helper uses the same zone.
- [x] 3 (Low) No password column — `eb9a48376`. `getUserActivity` selects `id`, `name`, `username`, `cefrLevel`; `createUser` returns only `{ id }` (no live caller).
- [x] 4 (Low) Assignment list — `28334ad9b`. No fetch while the list shows the server page for the first-page query and no retry was asked (the session loading after the first render put a skeleton over the server cards and fetched page 1 again).
- [x] 5 (Low) Streak — `7e528e591`. The home streak selects distinct Bangkok days (`date_trunc('day', (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok')`, checked on the local Postgres) and counts them with `countStreakFromDays`. `countStreakDays` (flashcard dashboard) uses Bangkok days too, so the two streaks agree. `primary-home.test.ts` renders every where clause with `PgDialect`.
- Open: the teacher per-student view shows nothing when the activity request fails (Phase 4 states); the flashcard "cards studied today" stat still counts from server midnight (UTC), and the flashcard streak query still reads every activity row of the year; `components/teacher/assignments.tsx` writes `createdAt` with `toLocaleString()` and no zone (Phase 3 redesign).

## Phase 3: Teacher
- [x] Owner decisions of 2026-10-05 (spec "Owner decisions", FR-1, FR-8, FR-12) — `41da1e37b`: Noto Sans Thai first in `--font-sans` (reverses M2), `defaultLocale: "th"`, Google Classroom import and the unused Google icons, copy, and asset removed.
- [x] Shell and dashboard — `a65d73cae`: teacher dashboard (`getTeacherHome` in `@reading-advantage/domain/primary-home`): classes and roster counts (own and co-taught, not archived), open assignments with done/assigned counts and a Bangkok-day due chip, "who needs help" (overdue work, no activity, or 7+ days since the last `user_activity`), a "Start class" link per class to the class page `#class-login` (no copy of the Lane B logic), and an empty Class book slot.
- [x] My-classes, roster, assignments, reports, student-progress layouts — `76720221c` (my-classes and roster; the Lane B live roster is the only student list on the class page, with the management parts in each row and a fallback list if the live roster fails; class sheet, QR cards, and enrollment restyled), `2a1c6247f` (teacher assignments: due chips incl. "No due date", Bangkok created date, states; "Late" is "Overdue" everywhere), `4bf53279b` (reports, student progress, my-students, game-challenges: labelled pickers, error states with retry), `571670430` (test fix).
- Phase 3 decisions: the reports "Active this week" tile is removed (the data had no last-activity field, so it always showed 0%); the student-progress back link goes to the class when the class page adds `?classroomId=`, otherwise to the reports; the game-challenges form gets a frame in Primary only (the play-kit panel and its English text belong to Lane G). Lane D+E slot: `ClassBookSlot` (`data-class-book-slot`) on the dashboard and on each class page.
- Phase 3 open items: the sidebar link "studentProgress" goes to `/teacher/student-progress`, which has no index page; game-challenges has no sidebar link; the privacy policy still names the Google Workspace APIs (legal text, owner review). Phase 3 had no separate review yet (stopped by the owner on 2026-10-05). Full Primary suite on 4bf53279b in 3 shards: 1097 passed, 2 failed (one fixed in `571670430`, one PGlite hook timeout under load in `userModel.activity.behavior.test.ts` that passes with a longer timeout); tsc exit 0.

## Phase 4: Quality
- [ ] States: loading, empty, error on every screen
- [ ] Accessibility pass with axe and a keyboard walk-through
- [ ] i18n keys and the locale toggle
- [ ] Sound set and mute
- [ ] README cleanup

## Gates
- [ ] Vision QA sweep at three widths, no Critical/High. The 768 px width needs real evidence:
  the Phase 0 audit looked at 768 for one route only (FR-10).
- [ ] Visual baselines recorded — tool: Playwright screenshots (`toHaveScreenshot` in a spec under `apps/primary-advantage/tests/e2e`, `@playwright/test` 1.61.0; owner decision 2026-10-05)

### Review notes (2026-10-05, review session, no code changes)
- Lane C forked from integration after the Lane B merge (`490707f12`), so it contains A, B, and
  M Phase 1. A merge to integration has no file conflicts today. Nothing from Lane C is in
  integration yet; the program progress table still says "C: Not started". The coordinator
  updates `measure/tracks.md`, this track's `metadata.json` (`status: planned` is stale), and the
  program table at merge time.
- The student home "today's lesson" card and the Reedy meter slot, and the teacher dashboard
  class-book slot, stay empty until Lanes D+E and F ship. Neither lane has a branch on 2026-10-05.
- Not in any phase today: the sign-in look (audit rank 1; Lane B changed copy and tap targets
  only) and the profile "Me" tab (audit rank 10). Gap list V9 (mascot art in empty states) and
  V10 (game readability inside the green shell; `/teacher/game-challenges` is still navy and
  cyan) are not in the spec. All wait for an owner decision (spec "Owner decisions").
- FR-2 moved 6 of 33 local UI files; 27 stay local because their API differs. The rest belongs
  to the semester-2 `primary_package_alignment` track.
