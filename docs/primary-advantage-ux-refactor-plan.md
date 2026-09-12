# Primary Advantage UX and Security Refactor Plan

Date: 2026-09-12. Scope: `apps/primary-advantage`. Method: read-only audit by five parallel
reviewers, one for each theme of the 2026-09-11 `apps/reading-advantage` audit.

This plan follows the Ponytail Rules. Each fix reuses existing code, installed dependencies, or
the platform. No new dependencies.

## 0. How this app compares to `reading-advantage`

The two applications share filenames but not code. Of the 79 component filenames that exist in
both applications, 1 is identical and 4 are near-identical. The other 74 have diverged. Fixes
from the five reading tracks do not port across. Each fix needs new work here.

Evidence of the divergence: the dead `transition.from !== "paused"` clause that track
`loading_state_correctness_20260911` removed from `reading-advantage` is still present at
`components/apk/StudentCartridgeHost.tsx:475`.

Application size: 443 TypeScript files, 82,491 lines, 51 pages, 72 API routes, 149 client
components.

Baseline state: 221 of 222 tests pass. One APK test fails. ESLint reports 0 errors and 1,038
warnings. `tsc --noEmit` reports 14 errors that the app owns, plus errors from a stale
`game-cartridges` build.

## 1. Summary of Findings

The audit found six systemic problems. The first one is new. It did not appear in the
`reading-advantage` audit, and it outranks every user-experience defect.

1. **Authorization is absent from the write path.** `PATCH /api/users/[id]` checks only that the
   caller is signed in. It then writes the target user's `role`, `password`, and `xp`. Any
   student can promote their own account to `SYSTEM`, or take over any other account. Four more
   API routes and eleven server actions run with no authorization at all. The proxy `matcher`
   excludes `api`, so no middleware protects any route.
2. **Score authority sits in the browser.** The server action `updateUserActivity` takes
   `xpEarned` from its caller and writes that number to `xpLogs` and `users.xp`. A student can
   set their own XP, level, CEFR level, and leaderboard rank.
3. **Audio and highlighting exist in six inline copies with no shared hook.** The word-highlight
   timer chain has no cancel path. Two lesson audio hints are dead because the server sends
   snake_case fields and the client reads camelCase.
4. **Loading flags leak.** Nine components show a skeleton or a spinner forever when a fetch
   returns empty, fails, or starts before the session resolves. The `/admin` landing page renders
   an empty `<div>`.
5. **Duplication is the dominant code pattern.** Nine measured fork pairs share 6,082 identical
   lines. About 13,900 lines are removable, or 18.5 percent of the application.
6. **Internationalization and accessibility have gaps.** Two message scopes sit at the wrong
   depth, so 42 keys fail for Chinese users. Seventeen clickable elements have no keyboard path.
   The application declares zero `aria-live` regions.

## 2. Security and Authorization (fix first)

This section is the reason to start here rather than with the reading experience. Every defect
below is confirmed by reading the code.

### 2.1 Privilege escalation and account takeover

`app/api/users/[id]/route.ts:14-17`. The `PATCH` handler calls `currentUser()` and rejects only
an anonymous caller. It then reads `role`, `xp`, `level`, `cefrLevel`, and `password` from the
request body and writes them to the user named in the URL. Lines 57-74 delete the target's role
rows and insert the requested role. Lines 41-45 hash and set the target's password.

Result: any signed-in student can send one request to make their own account `SYSTEM`. The same
request against another user's id changes that user's password.

Fix: require `ADMIN` or `SYSTEM`. Validate the body with Zod. Scope the target by `schoolId`.
Refuse a self-role change.

### 2.2 Unauthenticated API routes

| Route | Line | Defect |
|---|---|---|
| `app/api/articles/generate/route.ts` | 4 | No authentication. `amountPerGenre` is unbounded. One request starts bulk AI generation. |
| `app/api/assistant/lesson-chatbot/route.ts` | 22 | No authentication. The route validates the body shape, then streams model output. It is a free LLM proxy. |
| `app/api/upload/csv/cleanup/route.ts` | 6 | No authentication. `DELETE` joins an attacker-supplied `fileName` onto the temp directory and calls `unlink`. A `../../` prefix deletes files outside that directory. |
| `app/api/users/activitylog/[id]/route.ts` | 5 | No authentication. The route discards all four body fields and returns "success" after the controller throws. |
| `app/api/articles/route.ts` | 4 | No authentication. The whole article catalogue is public. |

The controllers behind `/api/students`, `/api/teachers`, `/api/classroom`, `/api/schools`, and
`/api/licenses` **do** enforce roles. The routes are thin, so a route-level search misreports
them. Eight of the fifteen routes sampled enforce a role. Seven do not.

Fix: add an authorization check to each of the five routes. Bound `amountPerGenre` with Zod.
Reject any `fileName` that is not a plain basename.

### 2.3 Server actions with no authorization

Eleven exported server actions run with no caller check. A server action is a browser-callable
POST endpoint. Its identifier reaches the client bundle when a client component imports it.

- `actions/test.ts` — `deleteAllArticles`, `deleteArticleFile`, `generateAudios`,
  `generateWordAudios`, `uploadArticleImages`, `generateImages`.
- `actions/article.ts` — `generateArticle`, `generateArticleNew`, `getDeleteArticleById`,
  `fetchArticleActivity`.

`deleteAllArticles()` at `actions/test.ts:63` deletes every article row and every associated
storage file. Five client components under `app/[locale]/system/test/` import from this module,
so the action identifiers ship to the browser. The proxy gates the `/system` **page**, but a
caller can invoke any action identifier from any route the caller can reach. A student on
`/student/read` can therefore reach `deleteAllArticles`.

`signUpAction` and `signInAction` are correctly unauthenticated. `fetchStudentsByClassCode` is
unauthenticated by design for the class-code sign-in flow.

Fix: add a role check to the first line of each of the eleven actions. Delete `actions/test.ts`
and the `/system/test` page if the tooling is no longer needed.

### 2.4 Client-supplied XP

`actions/user.ts:18-99`. The signature is
`updateUserActivity(articleId, type, xpEarned, timer, data)`. Line 55 computes the new level from
the caller's `xpEarned`. Lines 82-97 insert an `xpLogs` row with that value and update
`users.xp`, `users.level`, and `users.cefrLevel`.

Five lesson games pass a client constant. `components/lesson/games/lesson-vocabulary-flashcard-card.tsx:263`
passes `20` while `types/enum.ts:87` defines `VOCABULARY_FLASHCARDS = 15`, so the two values
already disagree.

Fix: remove the `xpEarned` parameter. Derive the award on the server from `ActivityType` and the
`UserXpEarned` table. `app/api/v1/apk/complete/route.ts` already does this through
`recordGameCompletion`. Use it as the model.

### 2.5 Cross-tenant reads

- `app/[locale]/teacher/student-progress/[id]/page.tsx:27` passes the raw URL parameter to
  `fetchUserActivity`. `server/controllers/userController.ts:38` checks only that a user is
  signed in. The model selects by id with no `schoolId` filter. Any teacher in any school can
  read any student's activity, XP history, name, and CEFR level.
- `app/api/users/[id]/article-records/route.ts:17` and `.../reminder-reread/route.ts:17` apply a
  role check, not an ownership check. The same read is available through the API.
- `app/api/users/search/route.ts:31` filters on name or email and excludes only the caller. There
  is no `schoolId` filter. Any signed-in student can enumerate every user's name and email in
  every school.
- `server/models/assignmentModel.ts:273` selects an assignment by id alone, with its article and
  its question rows. Cross-school read confirmed. An answer-key leak is probable; we did not read
  the question table columns.

### 2.6 Domain-layer bypass

43 files under `app/`, `components/`, and `actions/` import `@reading-advantage/db` directly: 33
API routes, 1 page, 6 server actions, and 3 components. Only 10 call sites use `createTenantDB`
from `@reading-advantage/domain`, and all 10 sit in the newer `app/api/v1/apk/*`,
`app/api/host-proof/*`, and `lib/apk/*` code.

The root `AGENTS.md` states that business logic must not live in pages, route handlers, or server
actions, and that every query must be scoped by `schoolId`. Every tenancy defect in section 2.5
follows from this bypass.

Fix: migrate route by route to domain functions behind `createTenantDB` and `assertCan`. Start
with the routes named above.

### 2.7 Other

- `proxy.ts:97` redirects a role-denied user to `/${locale}/unauthorized`. No such route exists.
  The user sees a 404 page and learns nothing about the real cause.
- `app/[locale]/[...not-found]/layout.tsx:15` redirects an anonymous visitor to sign-in. Any
  wrong URL therefore sends a visitor to sign-in instead of a 404 page. That layout also uses
  `settingsPageConfig.mainNav`, which is `[]`, so the 404 page shows no navigation.
- `proxy.ts:11` admits teacher, admin, and system to `/student`. Those roles then meet an empty
  leaderboard, an undefined `ownerKey` on the games page, and a 403 from
  `/api/v1/apk/complete`.
- `proxy.ts:13,17` names a role `"user"` that the role enum does not contain. `INTERN`,
  `SALES_REP`, and `SALES_ADMIN` appear in no list, so those accounts reach no protected route.
- No layout enforces a role. All five layouts forward nav configs to `AppLayout`, which checks
  only that a user exists. One `matcher` edit removes every guard at once.

## 3. Reading Experience (audio and highlighting)

The application has no `hooks/useAudio.ts`. Audio logic exists in six inline copies.

| Layer | Files | Mechanism |
|---|---|---|
| Read-aloud views | `articles/article-content.tsx`, `lesson/task/task-first-reading.tsx`, `lesson/task/task-deep-reading.tsx` | `<audio>` element, inline `handleTimeUpdate`, recursive `setTimeout` chain |
| Clip button (9 call sites) | `components/audio-button.tsx` | `<audio><source>` plus a 5 ms `setInterval` poll |
| Game clip players (detached) | 5 files under `lesson/games/` and `pratice/` | `new Audio()` inside a Promise |
| Game clip players (DOM) | `lesson-sentence-order.tsx`, `order-sentences-game.tsx` | `<audio ref>` plus a 50 ms `setInterval` |

### 3.1 High-severity defects

- **The highlight chain has no cancel path.** `article-content.tsx:264-275`,
  `task-first-reading.tsx:152-163`, `task-deep-reading.tsx:155-166`. `highlightIntermediateWords`
  calls `setTimeout(..., 100)` and stores no handle. No `clearTimeout` exists in any of the three
  files. The highlight therefore moves at a fixed 100 ms rate that the audio does not control.
  After a pause, a seek, or a word click, the chain continues while the audio is silent. Each
  `timeupdate` event that finds a gap starts another chain, so two chains write the same state
  and the highlight jumps backward. On unmount the chain still sets state.
- **`AudioButton` never reloads the media resource.** `components/audio-button.tsx:73-75` puts
  the URL on a `<source>` child and never calls `load()`. The resource-selection algorithm runs
  only at insertion. In the flashcard decks one instance serves every card, so the button plays
  the **first** card's audio with the **current** card's timestamps.
- **`AudioButton` stops at once when `endTimestamp` is 0.** Line 46 tests
  `currentTime + 0.5 >= endTimestamp`. Two flashcard callers pass `endTime || 0`. The card shows
  the playing icon for one frame and plays nothing.
- **Two lesson audio hints are dead.** `actions/flashcard.ts:1112-1120` and `:1213-1223` return
  `audio_url`, `start_time`, `end_time`. `lesson-sentence-order.tsx:58-60` and
  `lesson-sentence-cloze-test.tsx:57-59` declare `audioUrl`, `startTime`, `endTime` as optional,
  so TypeScript reports nothing. The values are always `undefined`. The cloze-test button does
  nothing and the ordering hint always shows "Audio data not available".
- **The word-order games index words with the sentence index.**
  `order-words-game.tsx:427,444,472` and `lesson-sentence-order-word.tsx:428,445,473` read
  `currentSentence.words[currentIndex]`, but `currentIndex` selects the sentence. The hint plays
  the wrong word, or rejects into an empty `catch`.
- **The 10 s fallback stops the timer but not the audio.** `lesson-sentence-order.tsx:509` and
  `order-sentences-game.tsx:496` call `cleanup()` without `audio.pause()`. A sentence group
  longer than 10 seconds plays on through the rest of the article.
- **The client cannot read the storage bucket name.** `lib/storage-config.ts:7` reads
  `process.env.STORAGE_BUCKET_NAME`. `cloudbuild.yaml:49` supplies it as a runtime server secret
  with no `NEXT_PUBLIC_` prefix, so every client caller uses the literal fallback
  `primary-app-storage`. If the deployed bucket has another name, all browser audio and images
  fail while server code works.
- **The play button says "Loading" forever.** `task-first-reading.tsx:29,227` and
  `task-deep-reading.tsx:29,238`. `setIsAudioLoaded(true)` exists only inside a commented block.

### 3.2 Medium-severity defects

`setCurrentTime` re-renders the whole article four times per second although the JSX never reads
it, and each render re-runs the paragraph grouping. A failed `play()` still sets the state to
"playing". No `onPlay` or `onPause` listener keeps the state in step with the element. Both speed
selectors use `defaultValue` while a `speed` state exists, so the rate survives a player close
but the label resets. The lesson tasks attach the playback-rate handler to `timeupdate` instead
of `loadedmetadata`. The lesson tasks never call `scrollIntoView`, so the highlight leaves the
viewport. Auto-scroll lists `currentWordIndex` in its dependencies, so a scroll starts every
100-300 ms. Five detached `new Audio()` objects keep playing after the user navigates away. A
clip whose `startTime` is 0 waits for a `seeked` event that never fires. Several `AudioButton`
instances can play at once. Save-to-flashcard is unreachable in the reading view, because its one
reference sits inside a commented block. The translate action is disabled until playback starts.
The four skip buttons have no `onClick`. In dark theme the hover colour and the playing-sentence
colour are the same value.

### 3.3 Defect classes from the sibling audit that are absent here

We confirmed these do not exist in this application: a double-advance race between `onEnded` and
`handleTimeUpdate`; a speed change that restarts the sentence; `speechSynthesis` without
`cancel()`; hand-built audio URLs; and audio reload on every render.

## 4. Loading and State Correctness

### 4.1 The `/admin` landing page is blank

`app/[locale]/admin/page.tsx:34` returns `<div></div>`. All content is commented out. An admin who
opens `/admin` sees an empty page.

### 4.2 Stuck skeletons

- The early return runs before `setLoading(true)`, so a missing user or a missing route parameter
  leaves the skeleton on screen forever: `dashboard/article-records-table.tsx:55,68`,
  `dashboard/reminder-reread-table.tsx:52,58`, `teacher/enhanced-class-roster.tsx:100,107`.
- `setLoading(false)` sits inside a `map` callback, so an empty array never clears the flag:
  `task-preview-vocabulary.tsx:30,48`, `task-vocabulary-collection.tsx:28,46`,
  `task-sentence-collection.tsx:17,36`.
- The fetch has no `catch` and no `response.ok` check: `task-sentence-activities.tsx:33,37-46`.
- `pratice/matching-game.tsx:770-781` renders a spinner with no empty state and no error state.
- `articles/word-list.tsx:51` and `articles/sentence.tsx:40` never set `loading` to `true`, so the
  skeleton is unreachable and an empty list renders a blank dialog.

### 4.3 Races and storms

- `components/apk/StudentCartridgeHost.tsx:438` reads `window.location.search` during render. The
  server renders `"briefing"` and the client renders `"demo"`, which is a hydration mismatch.
- `articles/article-select.tsx:57-60` advances the page only when the response has new rows. A
  page of duplicates leaves the page number unchanged, the observer rebuilds and fires at once,
  and the same request repeats without bound.
- `app/[locale]/admin/students/page.tsx:207,212,616` sends one `/api/students` request per
  keystroke. The comment claims a debounce that the code does not implement.
  `teacher/assignments.tsx:112` already has the correct pattern.
- `dashboard/article-records-table.tsx:96-98,103-109` fetches twice on every mount.

### 4.4 Components defined inside a render body

`student-assignment-table.tsx:554` (`AssignmentDetailDialog`),
`teacher/enhanced-class-roster.tsx:368` (`StudentRow`), and the two progress bars at
`standalone-lesson-progress-bar.tsx:384` and `lesson-progress-bar.tsx:534` (`LessonTimer`). Each
parent render creates a new component type, so the dialog remounts, loses focus, and restarts its
animation.

### 4.5 Wrong data and dead code paths

- Hardcoded Thai keys in data lookups: `articles/sentence.tsx:136`,
  `task-vocabulary-collection.tsx:148`, `task-deep-reading.tsx:352`. Vietnamese and Chinese users
  see Thai text.
- Seven components initialize the translation language to `"th"` rather than the active locale.
- `shared/change-role.tsx:174-175` builds Tailwind classes by interpolation
  (`dark:bg-${color}-900`). Tailwind cannot extract them, so the dark-mode colours never ship.
- `teacher/assignments.tsx:313-336` declares `const init = async () => {...}` and never calls it,
  so a deep link to a classroom does not preselect it.
- `teacher/assignments.tsx:196-207` builds a react-table instance that drives only the header. The
  body maps the raw array, so the sort buttons change state and no row moves.
- `teacher/assignment-dashboard.tsx:216-219` checks no `response.ok`, so an error body becomes the
  assignment state and line 429 throws.

## 5. Duplication and Dead Code

### 5.1 Measured fork pairs

`common` counts lines that are identical in both files.

| Pair | Lines | Common | Separating parameter |
|---|---|---|---|
| `lesson-sentence-cloze-test` / `cloze-test-game` | 1314 / 1338 | 1213 | `source: lesson \| deck` |
| `lesson-sentence-order-word` / `order-words-game` | 1125 / 1121 | 1057 | `source: lesson \| deck` |
| `lesson-sentence-order` / `order-sentences-game` | 1032 / 1023 | 970 | `source: lesson \| deck` |
| `lesson-sentence-flashcard` / `lesson-vocabulary-flashcard-card` | 737 / 745 | 691 | `cardKind: FlashcardType` |
| `lesson-sentence-matching` / `lesson-vocabulary-matching` | 745 / 732 | 685 | `cardKind: FlashcardType` |
| `lesson-progress-bar` / `standalone-lesson-progress-bar` | 821 / 668 | 642 | `source: assignment \| article` |
| `task-first-reading` / `task-deep-reading` | 570 / 659 | 558 | `enableTranslation: boolean` |
| `article-records-table` / `reminder-reread-table` | 294 / 233 | 210 | `variant: history \| reminder` |
| `lesson-card` / `standalone-lesson-card` | 66 / 67 | 56 | `source: assignment \| article` |

In each lesson/practice pair the only real difference is the data source: a server action in the
lesson copy, a `fetch` to an API route in the practice copy.

`pratice/matching-game.tsx` is a separate implementation, not a fork. It shares only 322 lines
with the lesson matching games. Extract helpers from it; do not merge it.

### 5.2 Repeated code

- 64 groups of byte-identical function bodies across two or more files: 1,271 removable lines.
  The largest are `generateBlanksForSentence` (2 copies, 170 lines each), the audio-segment
  player (4 copies, 166 lines), and `handleTimeUpdate` (72 lines).
- Ten files repeat the same react-table boilerplate: 654 lines. One `<DataTable>` shell of about
  90 lines replaces it.
- `sort(() => Math.random() - 0.5)` appears 22 times. `shuffleArray` is declared twice with an
  identical body.
- The role triple `["TEACHER","ADMIN","SYSTEM"]` repeats in 8 places. `lib/permissions.ts`
  already exists and is the correct home.
- Four of the five nav configs hold a byte-identical four-item `mainNav` array.
  `configs/site-config.ts` holds a sixth copy that has already drifted in order.
- 41 type names are declared in more than one file: 89 redundant declarations, 832 lines.
  `Student` (10 copies) and `Classes` (4 copies) never reached `types/index.d.ts` at all.

### 5.3 Dead code

| Item | Lines |
|---|---|
| Components with zero importers: `ui/sidebar.tsx`, `teacher/assignment-button.tsx`, `teacher/enrollment-demo.tsx`, `teacher/class-roster.tsx`, `teacher/reports.tsx`, `hooks/use-permissions.ts`, `hooks/use-mobile.ts`, `lib/calculateLevel.ts`, `types/types.d.ts` | 2,705 |
| Commented-out blocks of 10 lines or more, across 29 files | 2,461 |
| Unreferenced API routes | 1,209 |
| Unused imported names, about 350 real | ~300 |

Note: `teacher/class-roster.tsx` and `teacher/reports.tsx` are dead. The routes render
`enhanced-class-roster.tsx` and `teacher-progress-reports.tsx` instead. Several defects that a
file-level search reports therefore have no user effect today. All six
`${process.env.NEXT_PUBLIC_BASE_URL}` uses and the no-op `onClick={() => row.toggleSelected}`
sit in these two dead files. Delete the files rather than fix the lines.

### 5.4 Logging

128 `console.log` calls in 36 files: 14 in client components, 114 in server code.
`task-deep-reading.tsx:191` logs the whole article object on every render.

**Total removable: about 13,900 lines, or 18.5 percent of the 75,196 non-test lines.**

## 6. Internationalization, Accessibility, and Shell

### 6.1 Internationalization

- **Wrong scope depth in two locales.** `messages/cn.json:1945,2001` and
  `messages/tw.json:1945,2001` place `VocabularyMatching` and `Introduction` at the file root.
  `en`, `th`, and `vi` nest both inside `Lesson`. The components read
  `useTranslations("Lesson.VocabularyMatching")` and `useTranslations("Lesson.Introduction")`.
  42 keys fail per locale. Chinese users see raw key paths in the lesson introduction and the
  vocabulary matching game. This is a brace move, and it is the highest-value i18n fix.
- **Key parity is otherwise exact.** All five files hold 1,870 keys. `th` and `vi` match `en`
  exactly. `cn` and `tw` differ only by the 84 keys above. The 167 KB size of `th.json` against
  95 KB for `cn.json` reflects UTF-8 byte width, not missing content.
- **Hardcoded English** in the licence forms, the school form, the games catalogue, the APK
  surface, and the footer. `components/index/footer.tsx` has no `useTranslations` call.
- **Six strings in `student-assignment-table.tsx`** comment out a working `t()` call and write
  English next to it. The keys exist in `messages/en.json`.
- **Locale loss at the sign-in boundary.** Four pages call `redirect("/auth/signin")` from
  `next/navigation` with no locale. Four files import `Link` from `next/link`. Two sign-in forms
  set `window.location.href`.
- **Footer content.** A placeholder phone number `+1 (123) 456-7890`; a static `© 2024`; an
  `<a href="">` that reloads the page; a `/pricing` link to a route that does not exist; the
  address `info@primaryadvantage.com` against `admin@reading-advantage.com` on three other
  pages; and the spelling error "Provinding".
- Only 2 of 51 pages export `metadata`.

### 6.2 Accessibility

Baseline: 12 `aria-label` uses, 7 `role="alert"` uses, and 0 `aria-live` uses across 149 client
components. All 7 `role="alert"` uses sit in new APK and host-proof code. The legacy surface has
none.

- **17 clickable elements** have an `onClick` with no `role`, no `tabIndex`, and no keyboard
  handler. They include the history table rows, the classroom selector card, the article showcase
  cards, the flashcard faces, and three lesson collection panels. Because they have no `tabIndex`
  they can never take focus, so no focus style can apply.
- **`components/audio-button.tsx:76-81`** puts the `onClick` on the SVG icon. There is no button,
  no role, and no accessible name. A keyboard user cannot play sentence audio. This is a core
  function of a reading application.
- **13 icon-only buttons** have no `aria-label`, no `title`, and no `sr-only` text.
- **Form error containers have no `role="alert"`.** `components/form-error.tsx:10` serves 8 auth
  call sites. `components/ui/form.tsx:147-153` renders `FormMessage` with no role.
- **Sentence ordering has no keyboard path.** `pratice/order-sentences-game.tsx:828-836` and
  `lesson/games/lesson-sentence-order.tsx:837-845` use a `draggable` `div` with drag handlers
  only. There is no click path and no arrow-key path. The word-ordering variants use real
  `<button>` elements and are correct.
- **Zero `aria-live` regions.** Game scores, result panels, toasts, and upload progress change
  with no announcement.

### 6.3 Shell and navigation

- `components/shared/app-layout.tsx:4,19,32` imports `ProgressBar` and declares
  `disableProgressBar`, but the JSX renders neither. No student sees an XP bar.
  `components/progress-bar-xp.tsx:12` also carries its own defect: `LEVELS_XP.find(level =>
  level.min <= currentXP)` returns the first entry for any positive XP, so the target is always
  4999.
- `app-layout.tsx:64` passes hardcoded `xp: 0, level: 0, cefrLevel: ""` to `UserAccountNav`. The
  component reads none of the three today, so there is no visible effect, but the real values
  never reach the shell.
- `app-layout.tsx:73` sets the class `flexl-1`, which Tailwind does not define. The intended
  class is `flex-1`.
- `components/nav/sidebar-nav.tsx:106` calls `window.history.back()`. A direct link leaves the
  application.
- Three admin links point at routes that do not exist: `/admin/dashboard/reports` (3 sites) and
  `/admin/settings`.
- 7 of the 8 commented-out nav entries point at routes that do not exist. The eighth,
  `/system/test`, is a working developer page that any `system` user can reach.
- `app/[locale]/teacher/dashboard/page.tsx` returns the placeholder `<div>TeacherDashboard</div>`.
- Three files use directory or file names with spelling errors: `components/pratice`,
  `components/lesson/pratice`, `server/utils/genaretors`, and `actions/singinAction.ts`. 15 files
  import through them.
- Only three error and loading boundaries exist, all under `student/read`. There is no
  `global-error.tsx` and no route-group `error.tsx`. A throw on a teacher or admin page therefore
  replaces the whole shell with the Next.js default: a white page with one line of text, no
  retry, and no link back. The one boundary that exists always reports "404 Article Not Found",
  even for a database failure.

## 7. Prioritized Roadmap

Five tracks, in dependency order. Track 1 is new; it has no counterpart in the reading tracks.
Tracks 2 to 5 follow the shape of the five 2026-09-11 reading tracks.

### Track 1: `primary_authorization_hardening` — type: bug, priority: highest

Section 2. Nothing else ships until this lands.

1. Gate `PATCH /api/users/[id]` behind `ADMIN` or `SYSTEM`. Add Zod validation and a `schoolId`
   scope. Refuse a self-role change.
2. Add authorization to the five unauthenticated routes in section 2.2. Bound `amountPerGenre`.
   Reject a non-basename `fileName`.
3. Add a role check to the eleven server actions in section 2.3, or delete `actions/test.ts` and
   the `/system/test` page.
4. Remove the `xpEarned` parameter from `updateUserActivity`. Derive the award on the server.
5. Add ownership and school checks to the four cross-tenant reads in section 2.5.
6. Create `app/[locale]/unauthorized/page.tsx`. Remove the sign-in redirect from the 404 layout.
7. Restrict `/student` to `["student"]`. Derive `protectedRoutes` from the role enum and add a
   test that fails when a role has no policy.
8. Add a role assertion in each of the five layouts, as defence in depth.

Acceptance: a student account cannot change its own role or XP; each route in section 2.2 returns
401 or 403 without a session; a teacher cannot read another school's student progress; a test
covers each case.

### Track 2: `primary_broken_ux_fixes` — type: bug

Section 4.1, section 6.1 (footer and message scopes), section 6.3. Small independent fixes.

1. Move `VocabularyMatching` and `Introduction` inside `Lesson` in `cn.json` and `tw.json`.
2. Render the `/admin` landing page, or redirect it to `/admin/dashboard`.
3. Fix `flexl-1` to `flex-1`.
4. Repoint or delete the four dead admin links and the footer `/pricing` link.
5. Correct the footer: the year, the placeholder phone number, the empty `href`, the address
   conflict, and the spelling error.
6. Restore the six commented `t()` calls in `student-assignment-table.tsx`.
7. Point the two signup legal links at `/terms` and `/privacy-policy`.
8. Remove `target="_blank"` from the internal "Get Started" link.
9. Replace `captoliza` with `capitalize` in the 8 live occurrences.
10. Delete the `act` import and the two `console` module imports.

Acceptance: Chinese users see translated lesson text; `/admin` renders; no link in the application
points at a missing route.

### Track 3: `primary_audio_highlight_correctness` — type: bug

Section 3.

1. Hold the highlight timer in a ref. Clear it on pause, seek, sentence change, and unmount.
2. Extract one `useAudioSegment(url, start, end)` hook on the native `timeupdate` event. Make
   `AudioButton` a thin button over it. Fix the missing `load()` and the `endTimestamp === 0`
   case.
3. Align the audio field names between `actions/flashcard.ts` and the two game components.
4. Fix the word index in the two word-order games.
5. Call `audio.pause()` inside `cleanup()` in the two sentence-order games.
6. Hold detached `new Audio()` objects in a ref and pause them on unmount.
7. Rename the bucket variable to `NEXT_PUBLIC_STORAGE_BUCKET_NAME`, or serve the URL from the
   server.
8. Delete the `currentTime` state. Drive `isPlaying` from `onPlay` and `onPause`. Make both speed
   selectors controlled.
9. Give the playing, hover, and selected states three distinct colours in both themes.

Acceptance: the highlight tracks the audio within one sentence at 1x and 2x; no `setInterval`
remains in an audio component; unmounting stops every timer and every clip; both lesson audio
hints play.

### Track 4: `primary_loading_state_correctness` — type: bug

Section 4.2 to 4.5.

1. Clear the loading flag in every early-return branch, and move `setLoading(false)` out of the
   `map` callbacks.
2. Add an explicit empty state and an explicit error state to the matching game, the word list,
   and the sentence list.
3. Pass `mode` from `searchParams` into `StudentCartridgeHost`.
4. Track the article offset in a ref so a duplicate page still advances it.
5. Debounce the admin student search. Remove the duplicate mount fetch.
6. Hoist the four components that are declared inside a render body.
7. Replace the three hardcoded `.th` lookups and the seven `"th"` defaults with the active locale.
8. Replace the interpolated Tailwind classes with a static lookup map.
9. Call `init()` in `teacher/assignments.tsx`, and render the table body from
   `table.getRowModel()`.
10. Check `response.ok` in `teacher/assignment-dashboard.tsx`.

Acceptance: no skeleton survives an empty or failed fetch; rapid scrolling fires at most one
in-flight fetch; a ten-character admin search sends one request; no hydration warning on the
games page.

### Track 5: `primary_component_deduplication` — type: chore

Section 5. Do the deletions first; they shrink the surface of every merge.

1. Delete the nine dead files, the commented blocks of 10 lines or more, and the unreferenced API
   routes.
2. Merge the three lesson/practice game pairs behind one `source` prop.
3. Merge the flashcard pair and the matching pair behind one `cardKind` prop.
4. Merge first-reading and deep-reading behind `enableTranslation`.
5. Merge the two progress bars and the two lesson cards behind one `source` prop.
6. Merge the two history tables behind a `variant` prop.
7. Extract one `<DataTable>` shell for the eight live tables.
8. Extract `shuffle`, `formatTime`, the CEFR colour maps, `useDebounce`, and the role check into
   `lib/`.
9. Export one `sharedMainNav` and spread it in the other four configs.
10. Move the 41 duplicated type declarations into `types/index.d.ts`.
11. Remove the 128 `console.log` calls.
12. Rename `pratice` to `practice`, `genaretors` to `generators`, and `singinAction` to
    `signinAction`.

Acceptance: about 13,900 lines are removed; both call sites of every merge stay visually and
functionally identical; `build`, `check-types`, and `test` pass.

### Track 6 (optional): `primary_structural_alignment` — type: chore

Section 2.6 and section 6.2. This is the long tail.

1. Migrate the 33 API routes off the direct `@reading-advantage/db` import and onto
   `createTenantDB` and `assertCan`.
2. Move the four `useEffect` data fetches to their server pages.
3. Add one `error.tsx` per route group and one `global-error.tsx`.
4. Make the 17 clickable elements real buttons or links. Give the 13 icon-only buttons an
   `aria-label`. Add `role="alert"` to the two shared error components. Add `aria-live` to the
   game result panels.
5. Add a keyboard path to the two sentence-ordering games.
6. Render `ProgressBar` with real XP, and fix its level lookup, or delete it.

## 8. Out of Scope

- Framework upgrades. The version policy forbids them.
- Rewriting the 72 API routes wholesale. Track 1 touches only the routes it names; Track 6 owns
  the rest.
- The failing APK test in `components/apk/__tests__/StudentCartridgeHost.test.tsx`. It belongs to
  the uncommitted APK work in the tree.
- The stale `@reading-advantage/game-cartridges` build that blocks `turbo run check-types`. It is
  a workspace problem, not an application problem.
- Sharing code between `primary-advantage` and `reading-advantage`. The two have diverged too far
  for a cheap merge. Record it in `measure/tech-debt.md`.
