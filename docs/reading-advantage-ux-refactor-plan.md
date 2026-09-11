# Reading Advantage UX Refactor Plan

Date: 2026-09-11. Scope: `apps/reading-advantage`. Method: read-only audit of every user-facing page.

This plan follows the Ponytail Rules. Each fix reuses existing code, installed dependencies, or the platform. No new dependencies.

## 1. Summary of Findings

The audit found five systemic problems.

1. **Four parallel audio and highlight implementations.** `hooks/article-content/useAudio.ts`, `hooks/stories-chapter/useAudio.ts`, `lesson/phases/phase3-first-reading.tsx`, and `lesson/phases/phase5-deep-reading.tsx` duplicate the same logic. Phase3 runs three competing timers. This causes highlight lag and audio drift.
2. **Fetch-in-`useEffect` is the dominant data pattern.** Dashboard, goals, flashcards, matching games, assignments, and selects all fetch in the browser. The server pages above them already fetch the user. `Suspense` skeletons on dashboard, reports, and goals are decorative.
3. **Duplicated components.** Matching games, manage tabs, history tables, quiz cards, enroll flows, rating popups, and word lists exist in two copies. Admin, teacher, and system pages share table boilerplate.
4. **i18n gaps.** Goals, flashcards, settings, auth, system pages, and parts of teacher pages hardcode English. Some redirects hardcode the Thai locale.
5. **Accessibility gaps.** Clickable `div` and `TableRow` elements lack keyboard support. Context-menu-only actions have no keyboard path. Emoji and glyph-only indicators carry meaning.

## 2. Reading Experience (student read, lesson, stories)

This cluster is the core product. It has the worst highlighting and audio problems.

### 2.1 Highlighting and audio

Issues:

- `components/article-content.tsx` lines 342-368 duplicate the audio effect from `useAudio.ts` lines 169-195. Audio loads twice per track change.
- Speed changes re-assign `audio.src` and restart the sentence. The correct fix is `audio.playbackRate`.
- `onEnded` and `handleTimeUpdate` both advance the sentence. This is a double-advance race.
- Fallback timing uses `index * 2` seconds when timepoints are missing. Highlighting drifts immediately.
- Hover and selected states both use `bg-blue-200`. Playing uses `bg-red-200`, which reads as an error.
- Every sentence span uses `id="onborda-savesentences"`. Duplicate IDs are invalid HTML.
- `splitTextIntoSentences` runs on every render. The `useMemo` on `sentenceList` is dead.
- Phase3 tracks the current sentence with `setInterval`, `requestAnimationFrame`, and `ontimeupdate` together. Each calls `scrollIntoView`. This causes highlight jank.
- Phase3 and several components ship `console.log` in production paths.
- The two `useAudio` hooks are 95% identical. `handleNextTrack` attaches the `canplaythrough` listener after `audio.load()`. Cached clips can fire the event before the listener attaches.
- `audio-img.tsx` restarts the clip when the user clicks pause. `audio-button.tsx` and `audio-img.tsx` poll with 5-10ms `setInterval` timers. The timers leak on unmount.

Plan:

1. Delete the duplicated audio effect in `article-content.tsx`. The hook owns it. Pure deletion.
2. Remove `speed` from the effect deps in `useAudio`. Set `playbackRate` in the speed handler. Two lines.
3. Keep one advance path: either `onEnded` or the timeupdate check. Delete the other.
4. Merge `hooks/article-content/useAudio.ts` and `hooks/stories-chapter/useAudio.ts` into one `hooks/use-audio.ts`. Extract one `playFromIndex(index)` helper. Use phase5 as the model.
5. In phase3, delete the interval and the rAF loop. Keep `ontimeupdate`. Strip the `console.log` calls.
6. Extract one `useAudioSegment(url, start, end)` hook that uses the native `timeupdate` event. Make `audio-img.tsx` and `audio-button.tsx` thin buttons. Clear timers in effect cleanup.
7. Give the three highlight states distinct, meaningful colors. Update both article and stories components once, via a shared class constant.

### 2.2 Save to flashcard and translation

Issues:

- `stories-chapter-content.tsx` saves only the Thai translation. `article-content.tsx` saves four languages.
- In the stories version, the first "Save to flashcard" click only translates. The user must click again.
- `saveToFlashcard` in `article-content.tsx` fires up to four whole-passage translate POSTs for one sentence.
- `getTranslateSentence` is duplicated in eight files with three endpoint shapes. The `cn` to `zh-CN` normalization is re-implemented five times and missing in `article-showcase-card.tsx`.
- Save and translate are reachable only through right-click or long-press. There is no keyboard path.

Plan:

1. Make the stories save flow await translation, then save. Align the translation object with the article version.
2. Extract one shared `getTranslateSentence` helper with one normalization function. Delete the other copies.
3. Add a visible button or keyboard shortcut for save and translate. Keep the context menu.

### 2.3 Word lists and showcase cards

Issues:

- `word-list.tsx` and `stories-word-list.tsx` are near-identical dialogs. `word-list.tsx` has three copy-pasted mapping branches for response shapes.
- The wordlist fetches on every dialog open with no cache.
- Each `AudioImg` row renders its own `<audio>` element for the same mp3.
- `article-showcase-card.tsx` POSTs a translate request on mount for every card in the grid. Ten cards produce ten requests. `article-summary.tsx` already has the correct cache-check pattern.
- `stories-word-list.tsx` line 76 logs the full chapter payload to the user console.
- Both word lists import `filter` and `includes` from lodash for native array methods.

Plan:

1. Reuse the `translatedSummary` cache check from `article-summary.tsx` in `article-showcase-card.tsx`. Add the missing locale normalization.
2. Parameterize `word-list.tsx` with a data-source prop. Delete `stories-word-list.tsx`. Normalize the response shape once.
3. Replace lodash `filter` and `includes` with stdlib methods. One-line import changes.
4. Render one shared audio element per dialog, not one per row.

### 2.4 Quiz cards (MCQ, SAQ, LAQ)

Issues:

- `mc-question-card.tsx` (981 lines) runs a sessionStorage state machine with three separate corruption-repair blocks.
- Quiz state lives in four places: local state, zustand, sessionStorage, and server.
- `stories-chapter-question/*` forks all three quiz cards. This is about 2,200 duplicated lines.
- SAQ and LAQ cards re-declare `QuestionState` instead of importing it from `models/questions-model`.
- Timing hacks: `setTimeout(..., 10)` and `setTimeout(() => router.refresh(), 100)`.

Plan:

1. Parameterize the existing quiz cards with a `storageKey` and endpoint base. Delete the stories forks.
2. Consolidate sessionStorage handling into one small `useQuizProgress(key)` hook. Treat server state as the source of truth.
3. Import `QuestionState` from the model in all cards.

### 2.5 Page-level cleanups

- Fix the `max-w-[400px]]` typo in `read/[articleId]/page.tsx` line 151.
- Delete `import { log } from "console"` in `stories/[storyId]/page.tsx` and `admin/reports/[classroomId]/page.tsx`.
- Delete the stray `SelectStory;` statement in `stories-select.tsx` line 2.
- Delete dead `params` and `searchParams` handling in `read/page.tsx` and `stories/page.tsx`.
- Extract one `isAtLeastTeacher(role)` helper into `lib/`. It is duplicated in three files.
- Extract one GCS audio URL helper. The template is hardcoded in at least seven components.
- In `lesson/[articleId]/page.tsx`, run the article and classroom fetches in `Promise.all`. Guard `response.ok`.
- In `select.tsx`, add a `hasMore` guard and an `AbortController`. Use a relative fetch URL. `stories-select.tsx` already has `hasMore`.

### 2.6 Chatbot and rating

- `chatbot-floating-button.tsx` wipes message history on open. Remove the `setMessages([])` call.
- Remove the literal `" : "` prefix on bot messages.
- `rating-popup.tsx` refetches the entire article to update one number. `chapter-rating-popup.tsx` fires four sequential fetches. Merge the two components and update state locally.
- Replace the hand-rolled rating modal with the existing `Dialog` component.

## 3. Student Pages (non-reading)

### 3.1 Dashboard and reports

- `student/reports/page.tsx` duplicates `student/dashboard/page.tsx`. The i18n scopes are swapped between them.
- `useDashboardMetrice` fires five fetches in `useEffect`. The `Suspense` skeleton never covers data.
- `handleGenreClick` links to `/student/articles?genre=...`. That route does not exist. Fix: link to `/student/read`.

Plan: merge reports into the dashboard page or extract one shared view. Fix the genre link. Swap the i18n scopes. Long-term: fetch the metrics on the server and pass props. Delete `useDashboardMetrice`.

### 3.2 Vocabulary and sentences

- `tab-flash-card.tsx` and `flash-card-vocabulary-practice-button.tsx` are dead legacy code. Delete them after moving the `Word` type.
- `flashcard-game.tsx` uses `speechSynthesis` with hardcoded `en-US` and no `cancel()`. Audio overlaps. Add `speechSynthesis.cancel()` before each `speak()` and on unmount.
- `matching.tsx` hardcodes `translation.th`. Use `translation[currentLocale]` with a Thai fallback. One line.
- `matching.tsx` and `tab-matching-words.tsx` duplicate about 150 lines of game logic. Merge into one component with a `fetchWords` prop.
- Both matching files have `"use client"` commented out. Restore it. One line each.
- `matching.tsx` renders skeletons forever on an empty or failed fetch. Separate empty and loading states.
- The three `practic/*-page.tsx` loaders duplicate the deck-info fetch. Cloze uses a different endpoint for the same lookup. Unify on one endpoint.
- `vocabulary/tab-manage.tsx` and `manage-tab.tsx` duplicate a 400-line FSRS table. Merge later. Track as tech debt.
- `deck-view.tsx` uses `window.location.reload()`. Replace with `router.refresh()`.

### 3.3 Games

- `student/games/page.tsx` has no auth gate. Sibling pages redirect to sign-in. Decide the anonymous policy, then align.
- `StudentCartridgeHost.tsx` reads `window.location.search` during render. Pass `mode` from the page `searchParams` instead.
- Move the `requiresThaiTargets` list into the cartridge catalog package. One source of truth.
- Games catalog cards use `onClick` on a `Card` with a nested `Button`. Wrap the content in a real `Link`. Delete both click handlers.

### 3.4 History, assignments, goals, settings

- History page: fix the `captoliza` class typo in both tables. Preserve the real record status in the transform. Parameterize `ArticleRecordsTable` with a variant prop and delete `reminder-reread-table.tsx`.
- Assignments: remove the `act` import from `student-assignment-dashboard.tsx`. Add `redirect("/auth/signin")`. Hoist `AssignmentDetailDialog` out of the render body. Move `fetchNotifications` into its own effect. Replace `window.location.href` with `router.push`.
- Goals: fetch goals on the server and pass props. This makes the existing skeleton real and adds an error path. Replace native `confirm()` with the existing `AlertDialog`. Refetch after mutations without a full-page loading state.
- Settings: move the `cookies()` read below the auth guard. Render `GoogleClassroomButtonLink` inside the `DisplaySettingInfo` row.
- Level test: extract one `postChat` helper. It deletes about 80 duplicated lines. Move `cefrToSystemXp` into `lib/utils`. Add `aria-live="polite"` to the message list. Note: the client computes and POSTs its own placement XP. Record this trust issue in `measure/tech-debt.md`.

## 4. Teacher Pages

### 4.1 Broken navigation (fix first)

- `class-summary-table.tsx` line 201 links to `/teacher/class-detail/...`. That route does not exist. Point it to `/teacher/reports/${classId}`.
- `class-detail-dashboard.tsx` line 123 links to a nonexistent settings route. Remove the button or point to `/teacher/my-classes`.
- `class-roster.tsx` line 204 builds a URL with a double slash and uses `classrooms[0]?.id` instead of the selected classroom.
- Four redirects hardcode `/th/teacher/...`. Use locale-relative paths.
- Nine `router.push` calls prefix `NEXT_PUBLIC_BASE_URL`. This forces full-page reloads. Use relative paths.

### 4.2 Duplication removal

- Delete `components/teacher/reports.tsx`. It has zero importers.
- Merge `enroll-classes.tsx` and `unenroll-classes.tsx` into one component with a `mode` prop. They are 80% identical.
- Merge `my-students.tsx` and `class-roster.tsx` around one shared student table. Use the `/reset-all-progress` endpoint in both. Delete the direct PATCH in `my-students.tsx`.
- Make `class-roster/[classroomId]/page.tsx` pass the param as a prop. Delete the pathname parsing.
- Extract one shared teacher table shell. Seven files copy the same react-table boilerplate.
- Fix the no-op handlers `onClick={() => row.toggleSelected}` in both enroll components. Call the function.

### 4.3 Other teacher fixes

- Add a role and ownership check to `student-progress/[studentId]/page.tsx`. Mirror the check in `reports/[classroomId]/page.tsx`.
- Pass `disableLeaderboard` in the teacher layout. `AppLayout` currently fetches the student leaderboard on every teacher page.
- `assignment-page.tsx`: delete the dead column defs or render via `table.getRowModel()`. Delete the dead pathname pre-selection block and the `console.log`.
- `workbook-generator` has no inbound navigation. Decide: add it to the sidebar or delete the route.
- Replace `window.location.reload()` with `router.refresh()` in `class-detail-dashboard.tsx` and `useClassroomActions.ts`.

## 5. Admin and System Pages

- Fix the double pagination in `teacher-assignments-table.tsx`. The server pages the data and the table pages it again. Users cannot reach page 2.
- Fix the infinite-scroll race in `handle-article.tsx`. The loading flag is never set. The `loading ??` expression is wrong on a boolean.
- Fix the always-true loading condition in `system/reports.tsx` lines 290-294.
- Replace dynamic Tailwind class strings in `system-dashboard-client.tsx` and `change-role.tsx`. Tailwind cannot extract them. Use a static lookup map.
- Health badges in `system-dashboard-client.tsx` default to "excellent" when data is missing. Default to "unknown".
- Fix the mislabeled "Total XP" KPI in `school-dashboard-content.tsx`. It renders reading-session counts.
- Merge `admin/classroom-report.tsx` with the teacher roster table into one `ClassroomStudentTable`. This removes about 400 lines.
- Merge the two identical dashboard `loading.tsx` files. Merge the system and teacher passages pages, which render the same component.
- Delete dead code: `components/admin/dashboard-content.tsx`, `components/system-articles.tsx`, unused imports, commented blocks, the `debugAll` flag.
- Remove per-page role guards that duplicate the layout guards. Keep one failure mode: redirect.
- In `system/license/page.tsx`, run the auth check before the data fetch. Add delete confirmation and `router.refresh()`. Guard null `expiresAt`.
- Add one `error.tsx` per route group. Failed fetches currently crash or silently show empty tables.
- Parallelize sequential fetches with `Promise.all` in `admin/reports/page.tsx`, `system/schooldashboard/page.tsx`, and `create-new-student/page.tsx`.
- Extract one `CopyKeyButton`. The copy logic exists in three files.

## 6. Auth, Marketing, and App Shell

### 6.1 Auth

- The signup page is a dead end with a contact notice. The marketing CTA says "Start Your Free Trial". Align the CTA copy with the closed sign-up model.
- Use the `Link` and `useRouter` from `@/i18n/routing` in auth pages. Plain links drop the locale.
- Replace `window.location.href = "/"` in `user-signin-form.tsx` with `router.push` plus `router.refresh`.
- Add `role="alert"` to form error containers. Fix the SVG attribute casing in the reset form.
- Replace the fixed `h-[800px]` auth layout with a min-height.

### 6.2 Marketing and footer

- Delete the unused imports in `(index)/page.tsx`.
- Fix the footer: wrong external link, fake phone number, hardcoded 2024 year, and a contact email that conflicts with the contact page.
- Remove `text-white` from the hero heading. Inherit the theme foreground.
- Add per-page `metadata` to the marketing pages.

### 6.3 Shell and navigation

- `SessionSyncRedirect` always sends users to `/student/read`. Add a `destination` prop. Send teachers to `/teacher/my-classes`.
- Export one `sharedMainNav` from the index config. Spread it in the other four nav configs.
- Extract the repeated auth and expiry guard into one helper. It exists in four layouts and in `AppLayout`.
- Skip the leaderboard fetch when `disableLeaderboard` is set. Two lines.
- Add the missing sidebar i18n keys for admin and system configs.
- Collapse the three near-identical branches in `(index)/layout.tsx` into one return.
- Replace `window.history.back()` in the sidebar with a real link.
- In `user-account-nav.tsx`, compute `daysLeft` with `useMemo`. Guard the expiry badge behind a set `expired_date`.
- Delete the unused `userRole-context.tsx` and the dead `ProgressBar` import.
- Rename `theme-warpper.tsx` to `theme-wrapper.tsx`. Update the two imports.

## 7. Prioritized Roadmap

Each phase maps to one Measure track. Write tests for backend changes per project policy.

### Phase 0: Broken UX (one to two line fixes each)

1. Fix `/student/articles?genre=` link to `/student/read`.
2. Fix `captoliza` typos in history and teacher tables.
3. Fix the teacher 404 links: class-summary fallback and class-detail settings button.
4. Remove hardcoded `/th` redirects and `NEXT_PUBLIC_BASE_URL` prefixes in navigation.
5. Restore `"use client"` in both matching components.
6. Remove the `act` import in the assignment dashboard.
7. Add `speechSynthesis.cancel()` in the flashcard game.
8. Fix `max-w-[400px]]` and delete the `console` imports.
9. Stop the chatbot from wiping history on open.
10. Add `speechSynthesis` and audio-segment timer cleanup on unmount.

### Phase 1: Audio and highlighting correctness

1. Delete the duplicated audio effect in `article-content.tsx`.
2. Fix speed switching with direct `playbackRate` assignment.
3. Remove the double-advance race.
4. Merge the two `useAudio` hooks into one shared hook.
5. Remove the phase3 interval and rAF trackers. Keep `ontimeupdate`.
6. Extract `useAudioSegment` and rewrite `audio-img` and `audio-button` on it.
7. Fix highlight color semantics.
8. Fix the stories save-to-flashcard first-click bug and Thai-only translation.

### Phase 2: Loading and state correctness

1. Fix the teacher-assignments double pagination.
2. Fix the `handle-article` infinite-scroll race.
3. Fix the `system/reports` loading condition.
4. Fix the showcase-card translate N+1 storm with the existing cache check.
5. Fix `AudioButton` interval leak and restart-not-stop bug.
6. Assignments page: hoist the dialog, split the notification effect, use `router.push`.
7. Health badges default to "unknown". Fix the Total XP KPI.
8. `StudentCartridgeHost`: take `mode` from page props.

### Phase 3: Duplication removal

1. Unfork the stories quiz cards with parameterized endpoints and storage keys.
2. Merge the matching games, enroll flows, and history tables.
3. Merge `admin/classroom-report` with the teacher roster table.
4. Extract the shared teacher table shell and the shared `useQuizProgress` hook.
5. Merge the word-list dialogs and the rating popups.
6. Delete dead code: teacher `reports.tsx`, admin `dashboard-content.tsx`, `system-articles.tsx`, legacy flashcard files.
7. Consolidate sessionStorage quiz progress into one hook.

### Phase 4: Structural alignment (needs dedicated tracks)

1. Move client-side metric and goals fetches to server pages. Delete `useDashboardMetrice`.
2. Replace internal self-HTTP fetches with direct domain calls. This matches the existing tech-debt migration.
3. Add the role check to `student-progress/[studentId]`.
4. Move level-test XP authority to the server.
5. Converge phase5 audio onto the shared hook.
6. i18n pass over goals, flashcards, settings, auth, and system pages.
7. Accessibility pass: keyboard support for matching cards, table rows, game cards, and context-menu actions.

## 8. Out of Scope

- Framework upgrades. Version policy forbids them in feature work.
- New dependencies. Every fix uses installed packages or the platform.
- Middleware session-fetch latency. Record it in `measure/tech-debt.md` for a separate track.
- Rewriting the 294 legacy API routes. This plan only touches client usage of them.
