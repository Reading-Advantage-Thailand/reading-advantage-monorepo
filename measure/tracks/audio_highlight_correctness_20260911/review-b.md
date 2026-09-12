# Independent Review B: Reading Audio and Highlighting Correctness

- Track: `audio_highlight_correctness_20260911`
- App: `apps/reading-advantage`
- Review date: 2026-09-12
- Reviewer: Review B (independent second review)
- First review: `plan-review.md` (STOP)

Reviewer note: This review reads the current working-tree source of the track
files. It ignores unrelated APK dirty files. This review writes only this
report.

The working-tree repair is uncommitted in:

- `apps/reading-advantage/hooks/use-audio.ts`
- `apps/reading-advantage/__test__/audio-highlight-correctness.test.tsx`
- `apps/reading-advantage/components/article-content.tsx`
- `apps/reading-advantage/components/stories-chapter-content.tsx`

## Check Results

The four STOP items from Review A are closed in the working tree.

| Check | Result | Evidence |
| --- | --- | --- |
| 1. Combined clips advance via timeupdate | Pass | `isCombinedAudioClip` at `hooks/use-audio.ts:27-31`. `handleTimeUpdate` at lines 215-225 advances when `combinedClipRef.current` is true. `handleAudioEnded` at lines 205-213 stops playback for a combined clip. |
| 2. Effect omits sentenceList identity; rerender keeps the clip | Pass | Effect dependency array at line 273 is `[currentAudioIndex]`. The hook reads `sentenceListRef.current`. Cleanup at lines 270-272 removes the metadata listener only. The article and stories views memoize `sentences`. |
| 3. playFromIndex skips load when the URL is already loaded | Pass | `playFromIndex` at lines 112-116 returns after a seek when `loadedUrlRef` matches. The effect at lines 248-252 follows the same URL check. |
| 4. playFromIndex restores playbackRate after load | Pass | `seekToSentence` at lines 86-98 sets `audio.playbackRate` from `speedRef`. Both the cached-URL path and the `canplaythrough` path call it. |
| 5. Tests assert the combined-clip repair | Pass | `__test__/audio-highlight-correctness.test.tsx:189-207` asserts timeupdate advance on a shared URL. The old combined-clip freeze assertion is gone. New tests cover identity rerender, speed restore, and a single load. |

## Findings

### Closed from Review A

Review A Critical 1, Critical 2, High 3, High 4, Medium 5, and Medium 7 are
closed in the working tree. Combined clips use timeupdate. The effect lists
only `currentAudioIndex`. `loadedUrlRef` skips a second load. `seekToSentence`
restores speed. `clearCanplayHandler` removes a pending `canplaythrough`
listener.

### Medium 1: The last combined sentence can rewind the clip

Summary: When the last sentence end time arrives before the file end, the hook
sets the index to 0 and leaves the element playing.

Evidence:

- `hooks/use-audio.ts:199-202` — `advanceToNext` on the last index sets
  `isPlaying` to false and `currentAudioIndex` to 0. It omits `pause()`.
- `hooks/use-audio.ts:248-252` — the effect then seeks to sentence 0 start
  because the URL is already loaded.
- `components/article-content.tsx:87-90` — last `endTime` is
  `timepoint.timeSeconds + 10`.

Failure scenario: The last sentence is longer than 10 seconds. `timeupdate`
treats the sentence as complete. The highlight stops. The file continues. The
effect seeks to the start of the article. The student hears the article again.

This path is new. Combined clips now use timeupdate, so the last-sentence
branch can run before `ended`. A last sentence shorter than 10 seconds still
hits `ended` first and stops cleanly.

### Medium 2: FR-5 still leaves `console.log` in four reading components

Summary: Phase 3 is clean. Four other reading components still write
`console.log` on production paths.

Evidence:

- `components/lesson/phases/phase5-deep-reading.tsx:190,196,312,323,330,339`
- `components/lesson/phases/phase6-sentence-collection.tsx:328,347`
- `components/lesson/phases/phase12-sentence-activities.tsx:68,91`
- `components/lesson/phases/phase2-vocabulary-preview.tsx:370`

This is Review A Medium 6. It stays open.

### Low 3: The playing-color comment is still inaccurate

Summary: `lib/sentence-highlight.ts:15-17` says the playing color matches the
lesson phase color. The lesson phases use yellow classes. The shared constant
uses amber classes. AC-7 still holds because amber, emerald, and blue are
distinct.

### Low 4: `lesson-sentence-preview.tsx` keeps the old colors

Summary: Playing is still red. Hover and selected still share blue. FR-7 names
the article and stories views only. Record this for a later track.

### Low 5: `useAudioSegment` still skips `src` assignment on URL change

Summary: `hooks/use-audio-segment.ts:34-59` re-registers listeners when `url`
changes. It never assigns `audio.src` and never calls `audio.load()`. A parent
that keeps the component mounted and changes the URL keeps the old clip.

### Low 6: The spec text still prefers `ended` for every timepoint list

Summary: Spec FR-3 says: prefer `onEnded` when timepoints exist. The generator
writes one combined MP3 (`server/utils/generators/audio-generator.ts:188`). The
hook now selects the advance path by file layout. That is the correct behavior
for this app. Update the spec text so FR-3 matches the hook.

### Low 7: Plan metadata is still stale

Summary: `metadata.json` still has `"status": "new"` and `"actual_tasks": null`.
Phase 4 tasks are still open. These process items match Review A plan notes.

## Requirement Coverage

| FR | Status | Evidence |
| --- | --- | --- |
| FR-1 Remove the duplicated audio-loading effect | Implemented | `components/article-content.tsx` holds the article-reset effect at line 337. The hook owns loading. `loadedUrlRef` skips a second load. |
| FR-2 Fix playback-speed switching | Implemented | `handleSpeedTime` at `hooks/use-audio.ts:158-164` sets `playbackRate`. The loading effect omits `speed`. `seekToSentence` restores speed after load. |
| FR-3 Remove the double-advance race | Implemented for this app | Combined clips use timeupdate. Separate clips use `ended`. Fallback timing uses timeupdate. Spec text still prefers `ended` for all timepoints; see Low 6. |
| FR-4 Merge the two `useAudio` hooks | Implemented | Both views import `@/hooks/use-audio`. `playFromIndex` attaches `canplaythrough` before `load()`. `clearCanplayHandler` removes a pending listener. |
| FR-5 Fix phase3 first-reading tracking | Partly implemented | Phase 3 uses `timeupdate` only. Four other reading components still write `console.log`; see Medium 2. |
| FR-6 Extract a shared audio-segment hook | Implemented | `hooks/use-audio-segment.ts` uses `timeupdate` and cleans up on unmount. Pause stops the clip. URL changes still skip `src` assignment; see Low 5. |
| FR-7 Fix highlight color semantics | Implemented | `lib/sentence-highlight.ts` defines four constants. Article and stories views import them. Playing is amber, hover is emerald, selected is blue. |
| FR-8 Fix the stories save-to-flashcard flow | Implemented | `components/stories-chapter-content.tsx` awaits four translations and posts one save. The track test at lines 428-482 passes. |

## Acceptance Criteria

| AC | Pass/Fail | Evidence |
| --- | --- | --- |
| AC-1 Each audio track loads exactly once per change | Pass | Effect and `playFromIndex` skip load when `loadedUrlRef` matches the URL. Tests at lines 102-111, 209-224, and 288-303 pass. |
| AC-2 Changing playback speed does not restart the current sentence | Pass | `handleSpeedTime` sets `playbackRate` only. The effect omits `speed` and omits `sentenceList` identity. Test at lines 113-129 passes. |
| AC-3 No sentence is skipped during playback at 1x, 1.5x, and 2x | Pass | Combined clips advance on timeupdate. Separate clips advance on `ended`. Test at lines 189-207 covers the combined path. Medium 1 is a last-sentence rewind, not a skip. |
| AC-4 One shared `hooks/use-audio.ts` serves both views | Pass | `components/article-content.tsx:135` and `components/stories-chapter-content.tsx:139` both import `@/hooks/use-audio`. |
| AC-5 Phase3 uses only `ontimeupdate` | Pass | `components/lesson/phases/phase3-first-reading.tsx` holds the single tracker. |
| AC-6 No `setInterval` in the two audio components; unmount stops timers and audio | Pass | `hooks/use-audio-segment.ts:54-58` removes both listeners and pauses the element. Track tests at lines 323-370 pass. |
| AC-7 Three distinct background colors in the article and stories views | Pass | `lib/sentence-highlight.ts:12-20` gives emerald, amber, and blue. Both views use the constants. |
| AC-8 One click saves the sentence with all four translations | Pass | Track test at `__test__/audio-highlight-correctness.test.tsx:428-482` asserts one save and four translate requests. The test passes. |

## Test Result

Command:

```
cd apps/reading-advantage && CI=true npx jest --testPathPatterns='audio-highlight-correctness' --no-coverage
```

Output summary (verbatim tail):

```
PASS __test__/audio-highlight-correctness.test.tsx
  useAudio speed switching
    ✓ assigns src once per track change (32 ms)
    ✓ sets playbackRate on speed change without re-assigning src (6 ms)
    ✓ applies the current speed when metadata loads after a track change (4 ms)
  useAudio single sentence-advance path
    ✓ advances only via onEnded when each sentence is a separate clip (5 ms)
    ✓ advances via timeupdate on a combined clip and does not skip on ended (5 ms)
    ✓ does not reload when the sentence list identity changes (4 ms)
    ✓ advances only via timeupdate in fallback timing mode (3 ms)
  useAudio playFromIndex
    ✓ attaches canplaythrough before load() (3 ms)
    ✓ seeks to the sentence start and plays on canplaythrough, then removes the listener (4 ms)
    ✓ restores the selected playback speed after load (3 ms)
    ✓ does not load twice when playFromIndex and the index effect share a URL (3 ms)
  useAudioSegment
    ✓ uses timeupdate, not setInterval (3 ms)
    ✓ stops at the segment end on timeupdate (4 ms)
    ✓ pause stops the clip instead of restarting it (3 ms)
    ✓ removes listeners and pauses audio on unmount (4 ms)
  stories save-to-flashcard
    ✓ awaits translation then saves all four languages in one click (568 ms)

Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
```

The run also printed jsdom console noise, for example
`Error: Not implemented: HTMLMediaElement.prototype.load` from
`hooks/use-audio.ts:268`. The suite still passes.

The suite grew from 12 tests in Review A to 16 tests. The four new tests cover
the Review A STOP items.

## Verdict

CONTINUE. The four STOP items from Review A are closed. The five required
checks pass. Remaining findings are Medium and Low. The combined-clip freeze,
the reload-on-render, the double load, and the playbackRate loss stay closed.
