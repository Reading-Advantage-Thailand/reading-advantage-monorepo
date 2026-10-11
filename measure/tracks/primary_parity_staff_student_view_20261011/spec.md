# Spec: Staff student view (Preview mode)

Track ID: `primary_parity_staff_student_view_20261011`. Type: feature. App: `apps/primary-advantage`.
Triage row: STU-01 (owner answer "Preview mode").

## Overview

Teachers, school admins, and SYSTEM users cannot open the student pages. The proxy and the student
layout send them to `/unauthorized`. Legacy `bfea121` let every role open the student pages. It
saved the XP and the progress of a staff member like the data of a student.

This track gives staff a Preview mode. Staff open every student page with the content of their
school. A banner says "Preview". Nothing saves: no XP, no progress, no flashcards, no game
completions, no avatar purchases.

**Sprint goal:** A teacher, a school admin, and a SYSTEM user open each student page from the
account menu, see what a student of their school sees, and no student record changes.

## Track Set

This track is member 3 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_acceptance_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Context (verified 2026-10-11 at integration `ca8869cea`)

Paths are relative to `apps/primary-advantage` unless the path starts with `packages/` or `measure/`.

### Access today

- `lib/route-policies.ts:17`: `"/student": [ROLES.STUDENT]`.
- `proxy.ts:74-85` reads the role from `currentUser()` (line 64) and redirects a role that the
  policy does not list to `/${locale}/unauthorized` (lines 80-84). The matcher (line 97) excludes
  `/api`, so each API route checks the role itself.
- `app/[locale]/(student)/student/layout.tsx:8`: `await assertLayoutRole(protectedRoutes["/student"])`.
  `lib/layout-guard.ts:10-21` redirects a role that is not in the list.
- `components/nav/user-account-nav.tsx:106-112`: the "Student Dashboard" item shows only when
  `user.role === "STUDENT"`. (The triage gave line 103; line 103 is the "navigation" heading.)
- `app/[locale]/(student)/settings/user-profile/page.tsx:45-47`: the "Back to reading" link goes to
  `/student/read` for every role. For staff, the proxy then sends it to `/unauthorized`.
- `measure/tracks/primary_authorization_hardening_20260912/spec.md` FR-7 (lines 67-75) restricted
  `/student` to students, and AC-7 (line 98) says "`/student` admits only the student role". This
  track replaces AC-7 for page access. The intent of that security track stays: a staff member
  never writes a student record and never earns XP on a student page.

### Legacy behavior (`/home/daniebo/Desktop/primary-advantage` at `bfea121`)

- `components/nav/user-account-nav.tsx:101-105`: "Student Dashboard" (`/student/read`) for every role.
- `proxy.ts:19-24`: `"/student": ["student", "teacher", "admin", "system"]`.
- `lib/permissions.ts:33-35`: `STUDENT_ACCESS` admits all four roles.
- Legacy saved staff activity on the staff row: `actions/question.ts` `finishQuiz` checks only the
  session (lines 46-50) and writes `userActivity`, `articleActivityLog`, `xPLogs`, and `user.xp`.
  `app/api/games/rune-match/complete/route.ts` adds XP and a game ranking for any role.
  The new Preview mode changes this on purpose: staff save nothing.

### Write paths that student pages reach today

No write path has a shared guard. Most check only that a session exists. The inventory below is
the test list of Story S2.

| Kind | Write path | Check today |
| --- | --- | --- |
| Server action | `actions/question.ts:61` `finishQuiz` (user_activity, article_activity_logs, xp_logs, GP, users.xp, evidence job) | session only |
| Server action | `actions/question.ts:23` `retakeQuiz` (deletes a user_activity row) | session only |
| Server action | `actions/user.ts:28` `updateUserActivity` (lesson game rounds: activity, XP, GP) | session only |
| Server action | `actions/article.ts:77` `fetchArticleActivity` (inserts ARTICLE_READ on mount, `server/models/articleModel.ts:627`) | session only |
| Server action | `actions/flashcard.ts:206` `saveFlashcard`, `:865` `saveArticleToFlashcard`, `:715` `reviewCard`, `:652` `deleteFlashcardCard` | session only (reviewCard also checks the deck owner) |
| Server action | `actions/avatar.ts:15` `setAvatarProfileAction` (`packages/domain/src/primary-avatar/avatar.ts:67`) | session and school, no role check |
| API route | `app/api/lessons/[articleId]/route.ts:47` POST (lesson_progress, `recordLessonStep`) | session only |
| API route | `app/api/assignments/[id]/route.ts:14` (lesson step, student_assignments COMPLETED) | session only |
| API route | `app/api/v1/apk/complete/route.ts:21` (`recordGameCompletion`) | STUDENT role (lines 29-34) |
| API route | `app/api/v1/apk/rpg/route.ts:54` PATCH | STUDENT role |
| API route | `app/api/v1/apk/challenges/runs/route.ts:6` (`startClassChallengeRun`, `challenges:start` = STUDENT and TEACHER) | none at the route |
| API route | `app/api/v1/avatar/route.ts:10` GET (`ensureStarterSet` writes inventory, GP, loadout) | session and school |
| API route | `app/api/v1/avatar/purchase/route.ts:10`, `app/api/v1/avatar/loadout/route.ts:11` | session and school, no role check |
| API route | `app/api/v1/quest/heartbeat/route.ts:10` | class membership |
| API route | `app/api/voice/sessions/route.ts:24`, `[sessionId]/connected`, `[sessionId]/end` | STUDENT role in the domain (`packages/domain/src/primary-voice/sessions.ts:72`) |
| API route | `app/api/flashcard/decks/[deckId]/sentences-for-matching`, `sentences-for-ordering`, `sentences-for-cloze`, `words-for-ordering` (activity, XP, GP) | `article:read` (all four roles) |
| API route | `app/api/flashcard/cards/[cardId]/review/route.ts:23` | `article:read` |
| API route | `app/api/articles/questions/[articleId]/route.ts:29` POST (`userModel.ts:93`) | none |
| Page load | `student/home/page.tsx:105` `awardPowerUps`; `getAvatarState` (`ensureStarterSet`) on home, avatar, shop, games, story games, battle | — |
| Page load | `student/read/[articleId]/page.tsx:126-128` `saveArticleToFlashcard` | — |

The teacher lesson rehearsal page
(`app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]/rehearsal/page.tsx:46`)
renders the student `LessonCard` with no guard. Its hint says "Your steps are not recorded for the
class", but every lesson write above saves on the teacher's row (XP, activity, lesson progress).
The only existing "saves nothing" switch is the game demo mode (`components/games/game-host.tsx:43-44`,
`if (!save) return;` at line 141).

### Pages that need a student record

- Home: `getStudentHome` (`packages/domain/src/primary-home/home.ts:37`) asserts
  `gamification:read:own`. The central map gives it to STUDENT only (`packages/auth/src/permissions.ts:123`),
  but `packages/domain/src/gamification/permissions.ts:11,19` registers all four roles. The result
  for staff depends on the module load order.
- Avatar, shop, Class Quest, Reedy: each needs `user.schoolId` and a student avatar or class membership.
- History, reports, sentences, vocabulary: each reads the data of the signed-in user. So a staff
  member sees the own rows, and the rows that the rehearsal page wrote.
- Class book `/student/books/[classBookId]`: `getStudentBook` (`packages/domain/src/primary-books/class-books.ts:355`)
  needs class membership, so staff get `notFound()`.
- Games: the host loads the saved words from `/api/v1/apk/practice`, which refuses non-students
  (`app/api/v1/apk/practice/route.ts:55-57`), so the game shows a load error.

### School content

Articles are global (no `schoolId` on `articles`). Class books, the leaderboard, Class Quest, the
avatar, and Reedy use `user.schoolId`. `users.school_id` is nullable (`packages/db/src/schema/users.ts:37`),
and code assumes that a SYSTEM user has no school (`app/api/schools/ranking/route.ts:63`). No school
selector for SYSTEM exists today (`primary_parity_admin_dashboard_20261011` adds one, SYS-03).

## Design

- **D1 Preview is a server fact.** `lib/student-view.ts` derives the mode from the session role:
  `preview` when `isStaffRole(role)` (`lib/permissions.ts:276`), `student` for STUDENT. No query
  parameter, cookie, or client value sets or clears it.
- **D2 Three layers keep the data safe.**
  1. Pages: in preview, a server page does not run a page-load write and does not read the staff
     member's own student rows.
  2. App boundary: each server action and API route in the inventory calls
     `assertStudentWriter(user)` first. For staff, a server action returns
     `{ status: "preview" }` and a route returns 403 with the code `PREVIEW_READ_ONLY`. No
     database write runs.
  3. Domain: Primary-owned mutations with no role check (`setAvatarProfile`, `purchaseAvatarItem`,
     `setLoadout`, `ensureStarterSet`, `awardPowerUps`, the quest heartbeat) assert a STUDENT-only
     permission that the Primary domain module registers. Shared mutations that other apps use
     (`recordGameCompletion`, `startClassChallengeRun`) keep their permissions; the Primary route
     guards them.
- **D3 The client knows the mode.** The student layout puts the mode in a `StudentViewProvider`.
  A component that writes reads `useStudentView()`. In preview it does not call the write path.
  It shows the local result (for example the quiz score) and the note "Preview: not saved". If a
  write call still runs, the client shows the same note for the preview refusal, not an error.
- **D4 Banner.** Every student page shows a Preview banner in the RPG skin (`Banner` from
  `components/rpg/chrome.tsx`), with "Exit preview" to the role home (`roleDefaultRedirects`). The
  word "Preview" is also the Reedy product label (`student/reedy/page.tsx:22,51`); the banner copy
  must not look like the Reedy label (owner look check).
- **D5 Preview states.** A page that needs a student record shows a preview state. It has the
  default Forge hero, zero coins and XP, and empty notices. Each notice has one line that says what a
  student sees there. A preview state never shows sample student data or the staff member's own rows.
- **D6 Games.** In preview, the game host runs in the existing demo mode (`save={false}`). The
  practice route gives staff a sample word set from published article vocabulary (a read only).
- **D7 Class books.** In preview, `/student/books/[classBookId]` opens a book that the staff member
  can manage (`managedClassBook`, `class-books.ts:91`), with every lesson open and no progress. The
  lesson rehearsal page runs inside the provider, so it saves nothing too.
- **D8 SYSTEM school rule (owner look check).** A SYSTEM user with a `schoolId` sees that school. A
  SYSTEM user without a school sees the global catalogue (Read, games, stories when they exist) and
  the empty preview state for the school panels (leaderboard, class books, Class Quest). When
  `primary_parity_admin_dashboard_20261011` ships its SYSTEM school selector, preview does not use it
  in this track.
- **D9 AI feedback.** The SAQ and LAQ feedback call (`actions/question.ts:185` `getFeedback`) writes
  nothing, so preview allows it. Reedy stays student-only (it has a voice cost).

## Stories

### Story S1: Staff open the student pages
**As a** teacher, school admin, or SYSTEM user
**I want** a "Student view" item in the account menu that opens the student pages
**So that** I see what my students see

**Acceptance Criteria:**
- Given a TEACHER, ADMIN, or SYSTEM session, When the user opens `/student/home` or any page under `/student`, Then the page renders and the proxy does not redirect to `/unauthorized`.
- Given a STUDENT session, When the student opens a page under `/student`, Then the page renders with no Preview banner.
- Given a staff session, When the account menu opens, Then it shows a "Student view" item that opens `/student/home`.
- Given a staff session on any student page, When the page renders, Then a Preview banner shows with an "Exit preview" link to the role home.
- Given a staff session on `/settings/user-profile`, When the user selects the back link, Then the link goes to the role home and never to `/unauthorized`.
- Given a session with a role outside STUDENT, TEACHER, ADMIN, and SYSTEM (for example INTERN), When the user opens `/student/home`, Then the proxy redirects to `/unauthorized`.

**Estimate:** M
**Priority:** Must

### Story S2: Nothing saves in Preview mode
**As a** school admin
**I want** the student pages to save nothing for a staff member
**So that** XP, progress, flashcards, games, and avatar data stay correct for students and the security rule of FR-7 stays true

**Acceptance Criteria:**
- Given a TEACHER, ADMIN, or SYSTEM session, When each server action and API route in the write-path inventory runs, Then it returns the preview refusal and no insert, update, or delete runs.
- Given a STUDENT session, When the same write paths run, Then they save as before.
- Given a staff session on a quiz, When the staff member finishes the quiz, Then the score shows with "Preview: not saved", and the staff member's XP, `user_activity`, and `xp_logs` do not change.
- Given a staff session, When the staff member opens home, an article, the avatar pages, or a game, Then no page-load write runs (`awardPowerUps`, `ensureStarterSet`, `saveArticleToFlashcard`, `fetchArticleActivity`).
- Given a teacher on the lesson rehearsal page, When the teacher finishes a lesson step, Then no lesson progress, activity, or XP saves for the teacher.
- Given a new write route under the student API folders without `assertStudentWriter`, When the guard test runs, Then the test fails (counterexample fixture included).

**Estimate:** L
**Priority:** Must

### Story S3: Pages that need a student record show a preview state
**As a** teacher
**I want** home, avatar, shop, history, reports, sentences, vocabulary, Class Quest, Reedy, and games to render for me
**So that** I can explain each page to my class without a crash or an error page

**Acceptance Criteria:**
- Given a staff session, When home renders, Then it shows the guild hall with the default hero, zero XP and coins, the school leaderboard (none for a SYSTEM user without a school), and empty notices with preview copy; it does not call `getStudentHome`.
- Given a staff session, When the avatar picker, inventory, or shop renders, Then the heroes, pieces, and prices show, try-on works in the page, and Save, Wear, and Buy are off with "Preview: not saved".
- Given a staff session, When history, reports, sentences, or vocabulary render, Then each shows its empty state with preview copy and no row of the staff member.
- Given a staff session, When Class Quest or Reedy renders, Then each shows its "not in a class" or "only students talk to Reedy" state, and no session or heartbeat starts.
- Given a staff session, When a game opens from the games page, Then it runs with the sample word set in demo mode, and the end screen saves nothing.

**Estimate:** M
**Priority:** Must

### Story S4: Class books and lessons in preview
**As a** teacher
**I want** to open my class book and its lessons in the student view
**So that** I see the lesson path as my students see it before I teach it

**Acceptance Criteria:**
- Given a teacher who manages a class book, When the teacher opens `/student/books/<classBookId>` in preview, Then the book shows with every lesson open and no progress marks.
- Given a teacher who does not manage the class book, or a book of another school, When the teacher opens it, Then the page shows 404.
- Given a staff session, When home renders, Then it lists the class books that the staff member manages (none for a SYSTEM user without a school).
- Given a staff session in a lesson, When a lesson link points to a student page (for example `/student/reedy`), Then the page opens in preview and does not go to `/unauthorized`.

**Estimate:** M
**Priority:** Should

## Non-Functional Requirements

- NFR-1: No new dependency. Reuse `isStaffRole`, `roleDefaultRedirects`, `assertCan`, the RPG skin
  components, and the game demo mode.
- NFR-2: New server code logs with `lib/observability/logger.ts`. A preview refusal logs one line at
  info level with the operation name and the role, never the user name.
- NFR-3: Every exported function has JSDoc (AGENTS.md).
- NFR-4: The copy is in en, th, cn, tw, and vi message files (the vi copy can fall back to English
  only where the app already does that).
- NFR-5: No schema change and no ETL change. This track does not change the cutover runbook.

## Acceptance Criteria (track level, for the side-by-side kit)

Run each check with the kit of `primary_parity_acceptance_20261011` on its matched database copies
(the same school data in both apps).

- AC-1: Legacy `bfea121` account menu, teacher account: "Student Dashboard" opens `/student/read`.
  New build, teacher account: "Student view" opens `/student/home` with the Preview banner.
- AC-2: Teacher account, `/student/read/<articleId>` and its MCQ quiz. Legacy: the teacher's XP rises
  after the quiz. New: the score shows with "Preview: not saved", and the teacher's XP, `user_activity`,
  and `xp_logs` rows do not change (database count before and after).
- AC-3: Admin account and SYSTEM account: every page under `/student` in the page list renders (no
  error page, no `/unauthorized`). Captures at 375 px and 1280 px.
- AC-4: Student account: every student page works as before, with no banner, and a quiz saves XP.
- AC-5: Teacher account, lesson rehearsal page: legacy has no such page; new: after one step, the
  teacher's `lesson_progress` and `xp_logs` do not change.
- AC-6: Owner look check of the banner, the preview states, and the SYSTEM school rule (D8).

## Out of Scope

- A school selector for SYSTEM users (`primary_parity_admin_dashboard_20261011`, SYS-03).
- Sample student data in preview (D5 shows empty states only).
- A "view as this student" impersonation mode.
- Changes to the shared permissions of `recordGameCompletion` and `startClassChallengeRun` for
  other apps.
- Defects found while this track was written. Each needs its own fix:
  - `/api/students/[id]/assignments` has no session check (`server/controllers/assignmentController.ts:265-284`).
  - `getArticleById` loads the activity logs of every user for the article (`server/models/articleModel.ts:450-451`).
  - The settings license form sends PATCH to `/api/licenses/[id]`, which has no PATCH handler.
- The unused `STUDENT_ACCESS` helper in `lib/permissions.ts:46-48` and `canAccessRoute`
  (`lib/permissions.ts:248`) stay; a later cleanup removes them.
