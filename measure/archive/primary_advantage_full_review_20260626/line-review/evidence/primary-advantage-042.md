# Line Review Evidence: primary-advantage-042

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-042
Files assigned: 1
Lines assigned: 659

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx` | 1-659 | reviewed | 9 |

## Findings

### LR-042-001 — Function name mismatch with file and export

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:23`
- Evidence: Function is declared as `export default function TaskFirstReading` but the file is `task-deep-reading.tsx` and the barrel export in `index.ts:5` is `TaskDeepReading`. Meanwhile `task-first-reading.tsx:23` also exports `TaskFirstReading`, creating a name collision. The RA equivalents use distinct names (`Phase3FirstReading` vs `Phase5DeepReading`).
- Impact: Import ambiguity; TypeScript may silently resolve the wrong export depending on import path.
- Recommendation: Rename internal function to `TaskDeepReading` to match file and barrel export.

### LR-042-002 — Production console.log of full article object

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:194`
- Evidence: `console.log(article)` dumps the entire article object on every render. RA's `phase5-deep-reading.tsx` has targeted `console.log` statements for audio loading but not raw object dumps.
- Impact: Performance degradation on re-renders; leaks article data to browser console in production.
- Recommendation: Remove the `console.log(article)` statement.

### LR-042-003 — Commented-out audio initialization useEffect

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:40-70`
- Evidence: 31-line commented-out useEffect block for audio initialization. RA's phase5-deep-reading has an active audio initialization useEffect with loading states, error handling, and progress tracking.
- Impact: Dead code reduces readability; indicates incomplete implementation of audio loading compared to RA.
- Recommendation: Remove commented-out block or implement proper audio initialization with loading states.

### LR-042-004 — Commented-out UI features (highlight toggle, reset button, progress bar, completion status)

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:276-284,287-297,545-589,622-656`
- Evidence: Four large commented-out UI blocks: highlight mode toggle (lines 276-284), reset progress button (lines 287-297), reading progress bar (lines 545-589), and completion status indicator (lines 622-656). RA's phase5-deep-reading has all these features active. Primary Advantage has stripped them out, degrading the deep reading experience.
- Impact: Students lack visual progress feedback, highlight mode control, and completion status — all present in RA. The deep reading phase provides less UX than RA's equivalent.
- Recommendation: Either restore these features or document the intentional removal as a product decision.

### LR-042-005 — Hardcoded Thai translation locale

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:352`
- Evidence: `article.translatedPassage?.th?.[selectedSentence]` hardcodes `th` (Thai) as the translation language. RA's phase5-deep-reading uses `translatedPassage[locale]` with the locale parameter passed via props, supporting en/th/cn/tw/vi. Primary Advantage's component does not accept a locale prop.
- Impact: Translation overlay always shows Thai regardless of user's locale. Students using English, Chinese, Taiwanese, or Vietnamese locales get wrong translations.
- Recommendation: Accept locale as a prop (or read from `useLocale()`) and use `article.translatedPassage?.[locale]?.[selectedSentence]`.

### LR-042-006 — Missing "use client" directive

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:1`
- Evidence: Component uses `useState`, `useEffect`, `useRef`, and event handlers but has no `"use client"` directive. RA's phase5-deep-reading.tsx:1 has `"use client"`. Next.js 13+ App Router requires this for client components.
- Impact: May cause server-side rendering errors or hydration mismatches depending on how the component is imported. The barrel export in `index.ts` re-exports it, and it's used in `lesson-progress-bar.tsx` which is a client component — so it may work incidentally, but the missing directive is a correctness issue.
- Recommendation: Add `"use client"` as the first line.

### LR-042-007 — No audio loading progress or error UI

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:216-225`
- Evidence: Audio element uses inline `src` with `onTimeUpdate` but has no loading state indicator, no error handling UI, and no retry mechanism. RA's phase5-deep-reading has a full audio loading progress bar (lines 359-375), error state with retry button (lines 377-407), and loading percentage display. The Primary component sets `isAudioLoaded` via a commented-out useEffect (lines 40-70) so it never becomes true, meaning the play button always shows "Loading" text (line 240).
- Impact: Play button permanently shows "Loading" state because `isAudioLoaded` is never set to `true`. Students cannot play audio. This is a functional regression.
- Recommendation: Implement audio initialization with `loadeddata`/`canplaythrough` event handlers to set `isAudioLoaded`.

### LR-042-008 — handleTimeUpdate called manually instead of via event listener

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:95`
- Evidence: `handleTimeUpdate()` is called once inside `handlePlayPause` on line 95 when play is pressed, but is not attached as an `audio.addEventListener("timeupdate", ...)` listener for continuous updates. The `onTimeUpdate` prop on the `<audio>` element (line 219) does call `handleTimeUpdate`, but the manual call at line 95 is redundant and the event-driven approach on line 219 is the actual mechanism. However, the initial useEffect (lines 72-85) attaches `handleLoadedMetadata` to `timeupdate` instead of `handleTimeUpdate`, which is a naming/logic error.
- Impact: The `timeupdate` event listener on line 80 calls `handleLoadedMetadata` which only sets `playbackRate` — it does not update word/sentence highlighting. The `onTimeUpdate` prop on the `<audio>` element handles highlighting, so the useEffect on lines 72-85 is misleading dead logic.
- Recommendation: Remove the misleading useEffect on lines 72-85 or rename its handler to clarify it only manages playback rate.

### LR-042-009 — Missing isAudioLoaded guard in handlePlayPause

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-deep-reading.tsx:87-98`
- Evidence: `handlePlayPause` does not check `isAudioLoaded` before calling `audioRef.current.play()`. RA's phase5-deep-reading line 293 checks `if (!audioRef.current || !isAudioLoaded) return;`. Without this guard, the component may attempt to play audio that hasn't loaded, causing a browser autoplay rejection error.
- Impact: Potential browser console errors from attempting to play未loaded audio; unhandled promise rejection from `audio.play()`.
- Recommendation: Add `if (!audioRef.current || !isAudioLoaded) return;` at the top of `handlePlayPause`.

## No-Finding Notes

No additional no-finding notes. All 659 lines reviewed with 9 findings identified.
