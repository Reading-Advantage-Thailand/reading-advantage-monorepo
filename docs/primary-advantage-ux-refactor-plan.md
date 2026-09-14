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

Status (2026-09-12, track `primary_authorization_hardening_20260912`): done.

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

Status (2026-09-12, track `primary_authorization_hardening_20260912`): done.

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

Status (2026-09-12, track `primary_authorization_hardening_20260912`): done (role check added to
each named action; tooling kept).

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

Status (2026-09-12, track `primary_authorization_hardening_20260912`): done.

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

Status (2026-09-12, track `primary_authorization_hardening_20260912`): section 2.5 done.
Ownership and `schoolId` checks cover student-progress, article-records, reminder-reread, user
search, and assignment-by-id.

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

Status (2026-09-12, track `primary_authorization_hardening_20260912`): section 2.7 auth items
done. The unauthorized page exists, the 404 layout no longer redirects to sign-in, `/student`
admits only students, `protectedRoutes` derives from the role enum, and each of the five layouts
asserts a role.

## 3. Reading Experience (audio and highlighting)

> Status (2026-09-12, track `primary_audio_highlight_correctness_20260912`):
> done. Shared `hooks/useAudioSegment` drives clip playback on `timeupdate`
> with `load()` on URL change and play-to-end on zero end time; highlight
> timers are held in a ref and cleared on pause, seek, sentence change, and
> unmount; lesson audio fields are aligned to `audioUrl`/`startTime`/`endTime`
> and `translation`; word-order hints use the word index; sentence-order
> cleanup pauses audio; detached players pause on unmount; the client bucket
> reads `NEXT_PUBLIC_STORAGE_BUCKET_NAME`; `isPlaying` follows `onPlay`/
> `onPause`; highlight colours are distinct per state and theme.

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

Status (2026-09-12): done in track `primary_component_deduplication_20260912`.
Each pair merged behind its separating parameter; fork files deleted; call sites
updated. `practice/matching-game.tsx` kept as a separate implementation; its
shared `UserMatch` type moved to `types/index.d.ts`.

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

Status (2026-09-12): done in track `primary_component_deduplication_20260912`.
One `<DataTable>` shell serves the live react-table tables; one `shuffle`, one
`formatTime`, one CEFR colour map, one `useDebounce`, and one staff role check
live in `lib/`; one `sharedMainNav` serves the five page configs with the eight
commented nav entries resolved; clash-free duplicated types moved to
`types/index.d.ts`. Deviations: `License`/`Classroom`/`School`/`WordList`
duplicates keep local shapes that clash with the canonical declarations;
`generateBlanksForSentence`/audio-segment/`handleTimeUpdate` copies remain
inside merged game views to keep behaviour identical.

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

Status (2026-09-12): done in track `primary_component_deduplication_20260912`.
All nine zero-importer files deleted; commented-out blocks of 10+ lines
deleted; the three unreferenced debug API routes deleted. The remaining auth
routes are a public auth surface kept by design. Unused imported names were
not swept.

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

Status (2026-09-12): done in track `primary_component_deduplication_20260912`.
All 128 `console.log` calls removed from app source.

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

1. [x] Move `VocabularyMatching` and `Introduction` inside `Lesson` in `cn.json` and `tw.json`.
2. [x] Render the `/admin` landing page, or redirect it to `/admin/dashboard`.
3. [x] Fix `flexl-1` to `flex-1`.
4. [x] Repoint or delete the four dead admin links and the footer `/pricing` link.
5. [x] Correct the footer: the year, the placeholder phone number, the empty `href`, the address
   conflict, and the spelling error.
6. [x] Restore the six commented `t()` calls in `student-assignment-table.tsx`.
7. [x] Point the two signup legal links at `/terms` and `/privacy-policy`.
8. [x] Remove `target="_blank"` from the internal "Get Started" link.
9. [x] Replace `captoliza` with `capitalize` in the 8 live occurrences.
10. [x] Delete the `act` import and the two `console` module imports.

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
   `map` callbacks. (done: `primary_loading_state_correctness_20260912` FR-1)
2. Add an explicit empty state and an explicit error state to the matching game, the word list,
   and the sentence list. (done: `primary_loading_state_correctness_20260912` FR-2)
3. Pass `mode` from `searchParams` into `StudentCartridgeHost`. (done: `primary_loading_state_correctness_20260912` FR-3)
4. Track the article offset in a ref so a duplicate page still advances it. (done: `primary_loading_state_correctness_20260912` FR-4)
5. Debounce the admin student search. Remove the duplicate mount fetch. (done: `primary_loading_state_correctness_20260912` FR-5)
6. Hoist the four components that are declared inside a render body. (done: `primary_loading_state_correctness_20260912` FR-6)
7. Replace the three hardcoded `.th` lookups and the seven `"th"` defaults with the active locale. (done: `primary_loading_state_correctness_20260912` FR-7)
8. Replace the interpolated Tailwind classes with a static lookup map. (done: `primary_loading_state_correctness_20260912` FR-8)
9. Call `init()` in `teacher/assignments.tsx`, and render the table body from
   `table.getRowModel()`. (done: `primary_loading_state_correctness_20260912` FR-9)
10. Check `response.ok` in `teacher/assignment-dashboard.tsx`. (done: `primary_loading_state_correctness_20260912` FR-10)

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

1. [x] Migrate the 33 API routes off the direct `@reading-advantage/db` import and onto
   `createTenantDB` and `assertCan`. (done 2026-09-13: 24 route files migrated — the original 33
   predated track 5's debug-route deletions; `lib/__tests__/api-no-direct-db.test.ts` enforces
   the invariant)
2. [x] Move the four `useEffect` data fetches to their server pages. (done 2026-09-13: three of
   four converted — school-profile, class-roster enrollment, student/assignments page 1.
   `admin/students` stays client-side: its fetches are search/filter-driven. `article-select`
   already server-fetches its first page)
3. [x] Add one `error.tsx` per route group and one `global-error.tsx`. (done 2026-09-13: six
   route-group boundaries plus `global-error.tsx`; the read-page boundary shows the 404 copy only
   for real not-found errors, else a generic retry state)
4. [x] Make the 17 clickable elements real buttons or links. Give the 13 icon-only buttons an
   `aria-label`. Add `role="alert"` to the two shared error components. Add `aria-live` to the
   game result panels. (done 2026-09-12 and verified 2026-09-13: every actionable clickable now
   has a keyboard path — two word spans in `article-content.tsx` were the final gap; every
   icon-only button carries an accessible name; `AudioButton` is a real button; `role="alert"`
   on `FormError`/`FormMessage`; `aria-live="polite"` on game result panels; six hardcoded
   aria-labels translated into all five locales; footer and licence/school/games/APK strings
   translated; sign-in redirects, links, and logout keep the locale prefix; marketing/auth
   metadata added; teacher dashboard redirects to my-classes)
5. [x] Add a keyboard path to the two sentence-ordering games. (done 2026-09-12, track
   `primary_structural_alignment_20260912`: arrow-key reorder lives in the merged
   `lesson-sentence-order.tsx` after track 5's consolidation)
6. [x] Render `ProgressBar` with real XP, and fix its level lookup, or delete it. (done
   2026-09-13: DELETE branch — `progress-bar-xp.tsx` was never rendered; file, import, and
   `disableProgressBar` plumbing removed; fake-zero XP props removed from three layouts)

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

## 9. Independent Verification Addendum (2026-09-12)

Method: five parallel reviewers re-audited the application, one per section theme. The
orchestrator re-read the section 2 code directly. This addendum records verdicts, corrections,
and new findings. It does not replace the sections above.

### 9.1 Orchestrator confirmation of section 2

Read directly. All confirmed.

- `app/api/users/[id]/route.ts:14-17` rejects only anonymous callers. Lines 36-74 write `role`,
  `xp`, `level`, `cefrLevel`, and a bcrypt-hashed `password` to the user named in the URL.
- `proxy.ts:112-113` matcher excludes `api`. No middleware covers any API route.
- `app/api/articles/generate/route.ts:4-13` runs `generateAllArticle` with no authentication.
- `app/api/upload/csv/cleanup/route.ts:6-28` deletes `path.join(process.cwd(), "temp", fileName)`
  with no authentication and no path-traversal guard.
- `actions/test.ts:63` `deleteAllArticles()` deletes every article row and file with no caller
  check.
- `actions/user.ts:18-99` `updateUserActivity` takes `xpEarned` from the caller and writes it to
  `xpLogs` and `users.xp/level/cefrLevel`. XP is client-authoritative.
- `app/[locale]/teacher/student-progress/[id]/page.tsx:21-27` checks only that a user exists. No
  role check and no school ownership check.

### 9.2 Verdict summary by section

| Section | Claims confirmed | Corrections |
|---|---|---|
| §3 Audio and highlighting | 24 of 25 | One colour claim corrected (§9.3 C1) |
| §4 Loading and state | All | None |
| §5 Duplication and dead code | All | Counts drifted upward (§9.3 C2, C3) |
| §6 i18n, accessibility, shell | All | Three counts corrected (§9.3 C4-C6) |
| Broken-UX modeled classes | 20 of 21 | One count corrected (§9.3 C6) |

Four reading-app defect classes do not exist here: chatbot history wipe, `speechSynthesis`
overlap, hardcoded `/th/` redirects, and commented-out `"use client"` directives. Server
components do not self-fetch over HTTP; the local anti-pattern is client pages fetching `/api/*`
directly. No `parseActivityType`-style case regression exists in the controllers.

### 9.3 Corrections to the sections above

- C1 (§3): dark-theme playing and hover colours are not identical. Playing uses
  `dark:bg-blue-900/70`; hover uses `dark:hover:bg-blue-900/50`. The ambiguity stands; the values
  differ only in opacity.
- C2 (§5): the nine fork pairs now share 6,107 identical lines, not 6,082. The files changed
  since the first audit.
- C3 (§5): zero-importer files total 2,699 lines, not 2,705. `console.log` count is 119 in 34
  files, not 128 in 36. The 13,900-line removable estimate remains a floor, not a ceiling.
- C4 (§6.1): eight commented `t()` call sites exist in `student-assignment-table.tsx`, not six.
- C5 (§6.2): 22 clickable elements lack a keyboard path, not 17. `FormError` reaches 3 files, not
  8 call sites.
- C6 (§6.3): six of the eight commented nav entries point at missing routes, not seven.
  `/teacher/student-progress` and `/system/test` exist.

### 9.4 New findings

High severity:

- N1: the cloze audio hint is dead twice over. The server hardcodes `startTime = 0; endTime = 0`
  (`actions/flashcard.ts:1209-1210`). The client waits for a `seeked` event that never fires at
  position 0 (`lesson-sentence-cloze-test.tsx:610-629`). Fixing the snake_case field names alone
  does not restore the hint.
- N2: the ordering hint translation map is also dead. The server returns `translationMap`; the
  client interface declares `translation` (`actions/flashcard.ts:1112-1117` vs
  `lesson-sentence-order.tsx:52-57`).
- N3: `admin-stats-cards.tsx:46-52` renders fabricated fallback KPIs (25 teachers, 340 students,
  8.2% growth) when the fetch fails. Line 44 ships a hardcoded `monthlyGrowth: 12.5` on the
  success path. The admin dashboard can show invented numbers. (done:
  `primary_loading_state_correctness_20260912` FR-11: explicit error state, no fabricated numbers)
- N4: school-form fork not in the nine-pair table. `edit-school-form.tsx` (235 lines) and
  `school-profile-form.tsx` (239 lines) share 201 identical lines. Both are live in the same
  settings page.
- N5: question-content forks not in the nine-pair table. `la-question-content.tsx` and
  `sa-question-content.tsx` share 139 identical lines. `mc-question-content.tsx` and
  `lesson-task-mcq.tsx` share 127. The duplication sits one layer below the question cards.

Medium severity:

- N6: `task-deep-reading.tsx:194` logs the entire article object on every render. Line 23 exports
  a component named `TaskFirstReading`.
- N7: `article-content.tsx:323-332` schedules an uncancelled 50 ms `setTimeout` that calls
  `play()`. It fires after pause and after unmount. `handleTogglePlayer` (`:170-184`) never clears
  the in-flight highlight chain.
- N8: `audio-button.tsx:63-69` clears its interval on unmount but never pauses the element.
- N9: `admin-recent-activity.tsx:60-97` renders mock names and emails on fetch failure with no
  error indication. (done: `primary_loading_state_correctness_20260912` FR-11: explicit error
  state, no mock names)
- N10: `student-assignment-table.tsx:380,643` navigates with `window.location.href`. Full reload;
  locale prefix lost. (done: `primary_loading_state_correctness_20260912` FR-12: i18n
  `router.push`)
- N11: `deck-view.tsx:161,480` and `flashcard-dashboard.tsx:82` call `window.location.reload()`.
  Use `router.refresh()`. (done: `primary_loading_state_correctness_20260912` FR-12)
- N12: `student-rpg-catalog-panel.tsx:380-381` hardcodes "Read Thai" and "Listen to English". The
  labels are wrong for Vietnamese and Chinese users and are not translatable.
- N13: `task-preview-vocabulary.tsx` and `task-sentence-collection.tsx` share 143 of 186 lines.
  Both are live in both lesson progress bars.
- N14: copy-to-clipboard logic repeats four times in teacher components. None uses the existing
  `components/ui/copy-button.tsx`.
- N15: `admin/classrooms-table.tsx` and `admin/teachers-table.tsx` share 243 identical lines.
  `student-assignment-table.tsx` and `teacher/assignments.tsx` share 223.

Low severity:

- N16: `lesson-sentence-order.tsx:415-416` toasts success before it validates audio data.
- N17: the deck cloze route reads `audioUrl` through an `any` cast that cards do not carry
  (`app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:99-101`).
- N18: `[...not-found]/layout.tsx:16` redirects anonymous visitors to sign-in instead of showing
  a 404.
- N19: `user-account-nav.tsx:159` logout sets `window.location.href = "/"`. Locale prefix lost.
- N20: `teacher/dashboard/page.tsx:1` imports `currentUser` and never uses it.
- N21: `article-select.tsx:113` uses array index keys in the article grid.
- N22: `configs/index-page-config.ts:4-25` is a seventh nav copy with drifted item order. Any nav
  deduplication must cover it.

### 9.5 Roadmap impact

- Track 1 (`primary_authorization_hardening`) is unchanged and still blocks everything else. Its
  FR-6 already owns N18.
- Track 3 must add N1, N2, N6, N7, and N8. The cloze hint needs a server fix and a client fix.
- Track 4 must add N3, N9, N10, N11, and N21.
- Track 5 must add N4, N5, N13, N14, N15, and N22. The removable-line estimate rises by about 480
  lines.
- Track 6 must add N12, N19, and N20.

The six track specs and plans under `measure/tracks/primary_*_20260912/` incorporate these
findings as of 2026-09-12.

## 10. Repair Wave (2026-09-13)

An independent verification (track-audit, 2026-09-13) found the first implementation pass left
four tracks partial and introduced nine defects. A supervised repair wave fixed all nine defects
and completed every open requirement. Test-author separation applied: implementers did not write
their own tests; all new tests are behavioral. Verified end state: 493/493 tests across 69 files,
`tsc --noEmit` limited to 17 pre-existing APK errors, ESLint 0 errors, `pnpm build` exit 0.

Repaired defects: the `daysLeft`/`assignBy` message keys (user-facing raw key paths), the
unguarded Student Dashboard menu item, the SALES_ADMIN policy widening (reverted to ADMIN/SYSTEM),
the two `no-useless-catch` lint errors, the dead `prisoner.tutorialOnly` condition, the unloaded
APK test suite (next-intl mocks), the missing `/api/admin/recent-activity` route, the KPI field
mapping, the hardcoded Thai cloze lookup, six hardcoded aria-labels, and the lost
resume-from-pause guard in reading-advantage.

Track 1 residuals closed: client-authoritative XP removed from `question.ts` and five flashcard
routes; null-`schoolId` staff now fail closed; create-role validated against the role enum.

Track 3 residuals closed: all eight audio polls converted to `timeupdate`/`setTimeout` chains;
storage bucket env documented; playback-rate regression fixed; the 10-second fallback timer now
holds a handle.

Track 5: the four concatenated merges (sentence-order, cloze, flashcard, written-question) were
rebuilt as single parameterized implementations, gated by 28 characterization tests written before
the merges. About 7,700 lines removed total, 53 percent of the 14,400 target; the deviation is
recorded in the track plan and metadata.

Track 6: 24 API routes migrated onto `createTenantDB` with an invariant test; six route-group
error boundaries plus `global-error.tsx`; three pages moved to server fetches; `ProgressBar`
deleted (owner note in plan.md).

Measure status: all six tracks are `implemented_pending_manual_verification`. Twelve manual
verification tasks remain open and require a human.

## 11. Second Repair Wave (2026-09-13, post-verification)

An independent re-verification confirmed all first-wave gate claims and found new defects.
A second supervised wave fixed them. Verified end state: 548/548 tests across 76 files,
`tsc --noEmit` limited to 17 pre-existing APK errors, ESLint 0 errors (819 warnings),
`pnpm build` exit 0 with 38/38 pages.

Fixed defects:

- Role escalation: `users/[id]` PATCH now enforces a rank check via `roleAtLeast`; only
  SYSTEM can assign SYSTEM. The earlier enum validation was necessary but not sufficient.
- Sales-role redirects: `sales_rep` and `sales_admin` entries removed from
  `roleDefaultRedirects`. Both were added by the enum derivation and landed on a denied
  route and a nonexistent route. A contract test now pairs every redirect target against
  `protectedRoutes`.
- XP economy: proportionality restored server-side. MC pays the server-derived correct
  count (1 XP each); SA pays the grader score clamped to 5; LA pays the grader score
  clamped to 25; four flashcard deck routes pay clamp(score, 0, deck size) x 2 with the
  deck size counted server-side. A null/null response entry no longer counts as correct.
- Storage bucket: `NEXT_PUBLIC_STORAGE_BUCKET_NAME` is now a Docker build ARG/ENV and a
  cloudbuild build-arg with a substitutions default. Production no longer uses the
  hardcoded fallback silently.
- Fallback timers: cloze and both order-word bodies now settle playback through a ref
  stop-hook with unmount cleanup. The timer cannot fire after unmount.
- Cloze deck prefetch: the sync effect no longer wipes a prefetched `sentences` prop
  before raw data loads.
- Six message keys missing in all five locales (Track 4 FR-2 error/empty states) added
  to en/th/cn/tw/vi. Nine render tests converted from identity next-intl mocks to a
  shared real-messages provider, so missing keys now fail tests.
- Track 5: order-word (2,238→1,296) and matching (1,452→875) rebuilt as parameterized
  components behind 32 pre-written characterization tests. No concatenated pairs remain.
  Total removals now ~9,220 of the ~14,400 target (64 percent); the deviation note
  states the reason honestly.
- Track 6 FR-1: completed as a real migration. Routes import schemas from
  `/schema` and the live handle from domain-owned `getTenantDB`/`getUnscopedDB`;
  `assertCan` codifies each route's existing gate; the invariant baseline is empty and
  its regex covers the `/client` subpath. One exception: `schools/ranking` POST uses an
  `x-access-key` header with no user context.

Known limitations recorded for follow-up:

- The static source-grep tests are converted. Track
  `primary_test_hygiene_upload_fixes_20260914` measured 149 cases (the 97 figure
  undercounted) and resolved all of them: behavioral replacements, justified
  keeps (one architecture ratchet, six data or config pins), or duplicate
  deletions. Twelve remaining `readFileSync` test files are all justified.
- Upload writes are session-authoritative. The csv and classes routes stamp
  `schoolId` from the verified session only. The 400 fail-closed guard for
  sessions without school context is unchanged. The cleanup route never had
  the divergence.
- `upload/csv` deduplicates emails within one file (first row wins) and skips
  existing emails with conflict-safe inserts. The 200 response carries a
  validated summary: `inserted`, `skippedDuplicate`, `skippedExisting`.
- No production caller passes prefetched `sentences` to the cloze game; the
  prefetch path is a contract for future deck-page integration.

Measure status: all six tracks remain `implemented_pending_manual_verification`. The
twelve manual verification tasks still require a human.
