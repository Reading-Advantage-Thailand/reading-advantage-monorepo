# Behavior contract — primary_parity_staff_student_view_20261011

Template: `docs/runbooks/primary-behavior-contract-template.md`. Legacy revision `bfea121`
(`~/Desktop/primary-advantage`). Paths of the new app are relative to `apps/primary-advantage`
unless they start with `packages/`. Lines verified on 2026-10-12 at the Phase 0 start (`43c2cab2f`).

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| STU-01 | Staff open the student pages | "Preview mode": staff see the student pages and nothing saves | 2026-10-11 |
| STU-01a | SYSTEM school rule | Spec default D8, look check pending (owner, async) | 2026-10-12 |
| STU-01b | Banner and preview states | Design of Phase 0, look check pending (owner, async) | 2026-10-12 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Account menu "Student Dashboard" | all four | Opens the menu | The item goes to `/student/read` for every role | `components/nav/user-account-nav.tsx:101-105` |
| Route policy `/student` | all four | Opens a student page | The proxy admits student, teacher, admin, system | `proxy.ts:20` |
| Quiz finish | any session | Finishes a quiz | The action checks only the session, then writes `userActivity`, `articleActivityLog`, `xPLog`, and `user.xp` for the staff row | `actions/question.ts:33-48,67-146` |
| Rune Match complete | any session | Ends a game | Adds XP to the user and a ranking row, for any role | `app/api/games/rune-match/complete/route.ts:6,26-34` |

Legacy saves the XP and the progress of a staff member like the data of a student. The new Preview mode changes this on purpose (section 5).

## 3. Data read and written

This is the write-path inventory (the key part of the contract). It lists every path that a
student page reaches and that can write. "Guard today" is the check in the code at the Phase 0
start. "Layer" is where Phase S2 puts `assertStudentWriter` or the domain permission (D2).
Items marked NEW are not in the first version of the spec.

### 3a. Server actions

| Write path (`file:line`) | What it writes | Guard today | Layer (S2) |
| --- | --- | --- | --- |
| `actions/question.ts:63` `finishQuiz` | `user_activity` (insert 129), `article_activity_logs` (update 161, insert 165), `xp_logs` (172), `users.xp` (180), GP, evidence job | session only | action returns `{status:"preview"}` |
| `actions/question.ts:25` `retakeQuiz` | deletes a `user_activity` row (delete 48) | session only | action |
| `actions/question.ts:204` `getFeedback` | none (AI call) | session | allowed in preview (D9) |
| `actions/user.ts:28` `updateUserActivity` | lesson game rounds: activity, XP, GP | session only | action |
| `actions/article.ts:25` `fetchArticleActivity` | inserts `ARTICLE_READ` on mount (`server/models/articleModel.ts:312`, via `getArticleActivity` at line 280) | session only | action |
| `actions/flashcard.ts:206` `saveFlashcard` | saved words and sentences (deck, cards) | session only | action |
| `actions/flashcard.ts:865` `saveArticleToFlashcard` | article cards (called by `components/lesson/lesson-progress-bar.tsx:305`) | session only | action |
| `actions/flashcard.ts:715` `reviewCard` | card review state, XP | session and deck owner | action |
| `actions/flashcard.ts:652` `deleteFlashcardCard` | deletes a card (called by `components/manage-tab.tsx:113`) | session only | action |
| `actions/avatar.ts:15` `setAvatarProfileAction` | `setAvatarProfile` (`packages/domain/src/primary-avatar/avatar.ts:67`) | session and school, no role check | action and domain permission |

### 3b. API routes

| Write path (`file:line`) | What it writes | Guard today | Layer (S2) |
| --- | --- | --- | --- |
| `app/api/lessons/[articleId]/route.ts:47` POST | `lesson_progress` (`recordLessonStep`); called by `components/lesson/lesson-progress-bar.tsx:114` | session only | route 403 `PREVIEW_READ_ONLY` |
| `app/api/assignments/[id]/route.ts:14` POST | lesson step, `student_assignments` COMPLETED; `lesson-progress-bar.tsx:113` | session only | route |
| `app/api/v1/apk/complete/route.ts:21` POST | `recordGameCompletion` (XP, GP); `components/games/game-host.tsx:143` | STUDENT role (lines 29-34) | route (already refuses) plus client demo mode |
| `app/api/v1/apk/rpg/route.ts:54` PATCH | RPG state of a cartridge | STUDENT role | route (already refuses) |
| `app/api/v1/apk/challenges/runs/route.ts:6` POST | `startClassChallengeRun` (`challenges:start` = STUDENT and TEACHER) | none at the route | route |
| `app/api/v1/avatar/route.ts:10` GET | `ensureStarterSet` writes inventory, GP, loadout (a write on GET) | session and school | route and domain |
| `app/api/v1/avatar/purchase/route.ts:10` POST | `purchaseAvatarItem` (GP, inventory); `components/avatar/avatar-shop.tsx:115` | session and school, no role check | route and domain |
| `app/api/v1/avatar/loadout/route.ts:11` POST | `setLoadout`; `components/avatar/avatar-home.tsx:42` | session and school, no role check | route and domain |
| `app/api/v1/quest/heartbeat/route.ts:10` POST | `postHeartbeat` (`packages/domain/src/primary-quest/battle.ts:109`); `components/quest/battle-client.tsx:176,211` | class membership | route and domain |
| `app/api/voice/sessions/route.ts:24` POST, `[sessionId]/connected`, `[sessionId]/end` | Reedy sessions and minutes; `components/reedy/reedy-session.tsx:94,133,199,224` | STUDENT role in the domain (`packages/domain/src/primary-voice/sessions.ts:72`) | route |
| `app/api/flashcard/decks/[deckId]/sentences-for-matching`, `sentences-for-ordering`, `sentences-for-cloze`, `words-for-ordering` POST | activity, XP, GP; `components/practice/matching-game.tsx:250`, `components/lesson/games/lesson-sentence-cloze-test.tsx:332`, `lesson-sentence-order.tsx:453`, `lesson-sentence-order-word.tsx:398` | `article:read` (all four roles) | route |
| `app/api/flashcard/cards/[cardId]/review/route.ts:23` POST | card review | `article:read` | route |
| `app/api/articles/questions/[articleId]/route.ts:29` POST | answers (`userModel.ts:93`) | none | route |
| NEW `app/api/flashcard/save/[id]/route.ts:14` POST | reads the article, returns "Article saved"; check at write time whether it inserts | `article:read` | route (add to the S2 list) |
| NEW `app/api/users/activitylog/[id]/route.ts:14` POST | `handleUpdateUserActivity` (writes an MC activity row); `user.id` must equal `[id]` | session and owner id | route (add to the S2 list) |

### 3c. Page loads that write

| Write path (`file:line`) | What it writes | Guard today | Layer (S2) |
| --- | --- | --- | --- |
| `app/[locale]/(student)/student/home/page.tsx:105` `awardPowerUps` (`packages/domain/src/primary-quest/goals.ts:122`) | power-up rows | none | page skips it in preview; domain permission |
| `packages/domain/src/primary-avatar/shop.ts:119` `getAvatarState` calls `ensureStarterSet` (86) | starter inventory, GP, loadout, on a read | none | domain: split the read from the write, or STUDENT-only write |
| callers of `getAvatarState`: `student/home/page.tsx:76`, `student/avatar/page.tsx:43`, `student/avatar/shop/page.tsx:34`, `student/quest/battle/page.tsx:54`, `student/games/apk/[cartridgeId]/page.tsx:52`, `student/games/story/page.tsx:29` | the write above | none | pages skip in preview |
| `student/read/[articleId]/page.tsx:122-125` `saveArticleCardsAfterQuiz` (`packages/domain/src/games/primary-article-cards.ts:72`) | article cards on a GET render (quick_fixes review item 8) | already limited to `user.role === "STUDENT"` (the comment says the staff view saves nothing) | keep; add a test; staff show `saved=false` |
| `components/articles/article-content.tsx:87` `fetchArticleActivity`, `:391` `saveFlashcard` | see 3a | session only | client reads `useStudentView()` |

The spec cited `saveArticleToFlashcard` at `page.tsx:126-128`, and `articleModel.ts:627`, and
`question.ts:23,61,185`. Those lines are stale. This table has the verified lines.

### 3d. Teacher lesson rehearsal

`app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]/rehearsal/page.tsx:46`
renders the student `LessonCard` with no guard. Its hint says the steps are not recorded, but every
lesson write above saves on the teacher row. Phase S2 wraps it in `StudentViewProvider` with `preview`.

### 3e. Reads that need a student record (no write)

`getStudentHome` (`packages/domain/src/primary-home/home.ts:37`, `gamification:read:own`),
`getStudentBook` (`packages/domain/src/primary-books/class-books.ts:355`, class membership),
`app/api/v1/apk/practice/route.ts:55` and `app/api/v1/apk/content/route.ts:96` (STUDENT only),
and the history, reports, sentences, vocabulary pages (rows of the signed-in user).
Phase S3 and S4 handle these.

## 4. New target

- Drizzle tables (and the migration): none. NFR-5: no schema change.
- Domain functions (Zod input and output): `getPreviewBook` (S4); a STUDENT-only permission for student-record writes in `primary-avatar` and `primary-quest`.
- Permission action for `assertCan`: a new Primary permission for student-record writes (STUDENT only), registered like `packages/domain/src/gamification/permissions.ts`.
- TenantDB class for each table: no new table. Existing classes stay.
- AI adapter use: none.
- RPG skin components: `Banner`, `Panel`, `RpgLink`, `RpgButton`, `Plaque`, `Scene`.
- Routes (with the locale): `/en/student/*` open to TEACHER, ADMIN, SYSTEM; the account menu item "Student view" to `/en/student/home`.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| Staff save nothing on student pages (legacy saved XP and progress on the staff row) | Student XP and records must stay correct; keeps the intent of FR-7 of `primary_authorization_hardening_20260912` | STU-01 "Preview mode", 2026-10-11 |
| `/student` admits TEACHER, ADMIN, SYSTEM; this replaces AC-7 of the security track for page access | STU-01 | 2026-10-11 |
| Preview banner and "Exit preview" (legacy has none) | Staff must know that nothing saves | design look check pending (owner, async) |
| SYSTEM user with no school sees the global catalogue and empty school panels | Spec D8 default | look check pending (owner, async) |
| Menu item reads "Student view" (legacy "Student Dashboard") | The page is a view, not the staff dashboard | design look check pending (owner, async) |

## 6. Acceptance rows

Each row is a pair in `acceptance-pairs.json`. The AC-2 and AC-5 data checks are in
`acceptance-data-checks.sql`. The legacy article id `cmtyina5w000ps601n6htj9g3` is a raw legacy id.

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SSV-A1 | `/en/student/read` | `/en/student/home` | TEACHER | Menu item opens the student page; banner shows | none | batch capture (orchestrator) |
| SSV-A2 | `/en/student/read/<id>` | `/en/student/read/{map:article:<id>}` | TEACHER | Quiz: legacy XP rises; new "Preview: not saved", no change | counts before and after (AC-2) | batch capture (orchestrator) |
| SSV-A3 | `/en/student/read` | `/en/student/home` | ADMIN | Page renders, banner, no `/unauthorized` | none | batch capture (orchestrator) |
| SSV-A4 | `/en/student/read` | `/en/student/home` | SYSTEM | Page renders, banner, D8 school rule | none | batch capture (orchestrator) |
| SSV-A5 to A8 | history, reports, sentences, vocabulary | same paths | TEACHER | Empty states with preview copy, no row of the staff member | none | batch capture (orchestrator) |
| SSV-A9 | `/en/student/games` | `/en/student/games` | TEACHER | The games page renders; a game opens in demo mode | none | batch capture (orchestrator) |
| SSV-A10 | `/en/student/read` | `/en/student/home` | STUDENT | Works as before, no banner (AC-4) | none | batch capture (orchestrator) |
| SSV-A11 | `/en/settings/user-profile` | `/en/settings/user-profile` | TEACHER | Back link goes to the role home | none | batch capture (orchestrator) |
| (data) AC-5 | none | rehearsal page | TEACHER | One step: no `lesson_progress`, no `xp_logs` row | SQL before and after | orchestrator |

## 7. ETL and runbook changes

none. NFR-5: no ETL change and no cutover runbook change. Phase A adds one block to
`scripts/primary-parity/cutover-check.mjs` (the preview check) for rehearsal 3.
