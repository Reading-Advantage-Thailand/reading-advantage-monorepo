# Phase Code Review: Reading Audio and Highlighting Correctness

- Track: `audio_highlight_correctness_20260911`
- App: `apps/reading-advantage`
- Revision range: `1e3fc4d0e^..5542974c6`
- Commit count: 10
- Review date: 2026-09-12
- Reviewer note: This review reads the committed diff of the range above and the
  current state of the files that the track touched. The working tree holds
  changes from a different track (APK / advantage-games). The review ignores
  those changes. The review changed no source file.

Two later tracks (`component_deduplication_20260911`,
`structural_ux_alignment_20260911`) edited four of the same files. Those tracks
replaced inline URL builders and the inline translate helper with shared
modules. They kept every fix from this track. They weakened no fix and reverted
no fix.

## Findings

### Critical 1: The highlight stays on one sentence for the whole article

Summary: The `ended` event is the only advance path when timepoints exist, but
one article has one combined audio file, so `ended` fires one time.

Evidence:

- `apps/reading-advantage/server/utils/generators/audio-generator.ts:188` —
  `file: \`${articleId}.mp3\`, // Final combined file name`
- `apps/reading-advantage/hooks/use-audio.ts:142-166`
- `apps/reading-advantage/components/article-content.tsx:133-136`
- `apps/reading-advantage/components/stories-chapter-content.tsx:136`

The generator writes one combined MP3 for each article. It gives every timepoint
the same `file` value and an offset in `timeSeconds`. The reading components
therefore build a sentence list in which all entries share one `audioUrl`.

`components/article-content.tsx:133-136` sets `hasTimepoints: true` whenever the
article carries timepoints. `components/stories-chapter-content.tsx:136` passes
no options, so `hasTimepoints` takes the default value `true`
(`hooks/use-audio.ts:32`). In that mode `handleTimeUpdate`
(`hooks/use-audio.ts:151-166`) skips the advance check, and only
`handleAudioEnded` advances the index.

Failure scenario: A student starts the audio at sentence 0. The element plays
from the start of the combined file to the end of the combined file. The `ended`
event fires one time, after the full article. The highlight stays on sentence 0
for the whole article. The player then jumps to sentence 1 and plays the rest of
the article again.

The code before this track advanced through `handleTimeUpdate`. Commit
`50f6b0c` removed that path for articles and stories. This is a new defect that
this track introduced. It fails AC-3 and NFR-2.

### Critical 2: The hook reloads the audio on every render

Summary: The audio-loading effect depends on the `sentenceList` array identity,
and that identity changes on every render.

Evidence:

- `apps/reading-advantage/hooks/use-audio.ts:209` — `}, [currentAudioIndex, sentenceList]);`
- `apps/reading-advantage/hooks/use-audio.ts:188-189` — `audio.src = ...; audio.load();`
- `apps/reading-advantage/hooks/use-audio.ts:206` — `audio.pause();` in the cleanup
- `apps/reading-advantage/components/article-content.tsx:70` — `const sentences = splitTextIntoSentences(article.passage, true);`
- `apps/reading-advantage/components/stories-chapter-content.tsx:76` — the same call
- `apps/reading-advantage/components/article-content.tsx:113` — `[article.timepoints, article.id, sentences, cacheKey]`
- `apps/reading-advantage/components/stories-chapter-content.tsx:102` — `[story.timepoints, story.storyId, chapterNumber, sentences]`

`splitTextIntoSentences` returns a new array on each call, and neither component
memoizes that call. The `useMemo` on `sentenceList` therefore returns a new array
on every render. The effect dependency array sees a new value, so the effect
runs again, pauses the element, assigns `src`, and calls `load()`.

A measured probe confirmed the behavior. Three extra renders produced three
extra `load()` calls and four `src` assignments.

Failure scenario: A student plays the audio and opens the translation panel. The
panel sets React state. The component renders again. The effect cleanup pauses
the element, the effect reloads the clip, and playback restarts at the sentence
start time. Every state change in the page repeats this.

Commit `8e9480e` correctly reduced the dependency array to `[currentAudioIndex]`.
Commit `98c11a9` (the hook merge) added `sentenceList` back. This is a new defect
that this track introduced. It fails AC-1 and AC-2.

### High 3: Each advance and each sentence click loads the clip two times

Summary: `playFromIndex` and the loading effect both assign `src` and call
`load()` for the same index.

Evidence:

- `apps/reading-advantage/hooks/use-audio.ts:54-72` — `playFromIndex` assigns `src` and calls `load()`
- `apps/reading-advantage/hooks/use-audio.ts:131-140` — `advanceToNext` calls `setCurrentAudioIndex` and `playFromIndex`
- `apps/reading-advantage/hooks/use-audio.ts:183-209` — the effect assigns `src` and calls `load()` on the index change

A measured probe recorded this ordered call log for one advance:
`["pause","src:set","add:canplaythrough","load","src:set","load","add:loadedmetadata"]`.

Failure scenario: The student clicks a sentence. The browser requests the audio
file two times. The second `load()` cancels the first one. Two handlers then
compete to set `currentTime` and to call `play()`. FR-1 removed the duplicate
effect from the component, but the merged hook holds the same duplicate inside
itself. This fails AC-1.

### High 4: `playFromIndex` loses the selected playback speed

Summary: `playFromIndex` calls `load()` but never sets `playbackRate`, and the
HTML load algorithm resets `playbackRate` to 1.

Evidence:

- `apps/reading-advantage/hooks/use-audio.ts:54-72` — `playFromIndex` sets `currentTime` only
- `apps/reading-advantage/hooks/use-audio.ts:98-104` — `handleSpeedTime` sets `playbackRate` on the element
- `apps/reading-advantage/hooks/use-audio.ts:193` — the effect restores `playbackRate` from `speedRef`
- `apps/reading-advantage/hooks/use-audio.ts:80-84` — `handlePreviousTrack` at index 0 calls `playFromIndex` only
- `apps/reading-advantage/hooks/use-audio.ts:119-129` — `handleSentenceClick` on the current index calls `playFromIndex` only

The effect at line 193 restores the speed when `currentAudioIndex` changes. Two
paths call `playFromIndex` without a change of `currentAudioIndex`. Those paths
get no restore. A measured probe set the speed to 2, simulated the load reset,
called `playFromIndex(1)`, and read `playbackRate` as 1.

Failure scenario: The student sets the speed to 2x and then clicks the sentence
that is already playing. The clip restarts at 1x. The speed control still shows
2x.

### Medium 5: The hook can keep a `canplaythrough` listener

Summary: `playFromIndex` removes the listener only inside the handler, so an
unfired listener stays on the element.

Evidence: `apps/reading-advantage/hooks/use-audio.ts:61-69`.

Failure scenario: The student clicks three sentences quickly. Each call attaches
a new `canplaythrough` listener and starts a new load. The earlier loads stop, so
their listeners never fire and never detach. A later load fires all of them. Each
listener sets its own `startTime` and calls `play()`, so the audio jumps to an
old sentence.

### Medium 6: FR-5 removed the `console.log` calls from phase3 only

Summary: Four other reading components still write `console.log` in production
paths.

Evidence:

- `apps/reading-advantage/components/lesson/phases/phase5-deep-reading.tsx:190,196,312,323,330,339`
- `apps/reading-advantage/components/lesson/phases/phase6-sentence-collection.tsx:328,347`
- `apps/reading-advantage/components/lesson/phases/phase12-sentence-activities.tsx:68,91`
- `apps/reading-advantage/components/lesson/phases/phase2-vocabulary-preview.tsx:370`

FR-5 asks for the removal in phase3 "and the other reading components listed in
the audit". `docs/reading-advantage-ux-refactor-plan.md:33` names "Phase3 and
several components". Commit `1d8f0f0` cleaned phase3 and
`components/stories-word-list.tsx` only. `AGENTS.md:548` asks for structured
logs and no free-form console logging in production code.

### Medium 7: The track tests record the wrong behavior and hide three findings

Summary: The test suite passes, but it asserts the defect in Finding 1 and it
cannot detect Finding 2 or Finding 3.

Evidence:

- `apps/reading-advantage/__test__/audio-highlight-correctness.test.tsx:153-158` —
  the test asserts that a `timeupdate` past the sentence end must not advance
- `apps/reading-advantage/__test__/audio-highlight-correctness.test.tsx:84-99` —
  the suite passes one module-level array, so the identity never changes
- `apps/reading-advantage/__test__/audio-highlight-correctness.test.tsx:105-111` —
  the test calls `setCurrentAudioIndex` directly, so `playFromIndex` never runs

Failure scenario: A later developer fixes Finding 1 and the suite turns red. The
suite therefore protects the defect. `measure/lessons-learned.md` warns about
tests that prove the source looks correct instead of the behavior.

### Low 8: The comment about the playing color is not accurate

Summary: `lib/sentence-highlight.ts` claims that the playing color matches the
lesson phase color, but the two colors are different.

Evidence:

- `apps/reading-advantage/lib/sentence-highlight.ts:15-17` — `bg-amber-200 dark:bg-amber-700`
- `apps/reading-advantage/components/lesson/phases/phase3-first-reading.tsx:540` — `bg-yellow-200 dark:bg-yellow-600`
- `apps/reading-advantage/components/lesson/phases/phase5-deep-reading.tsx:617` — the same yellow classes

Change the comment, or change the constant to the yellow classes. AC-7 stays
true, because amber, emerald, and blue are three distinct colors.

### Low 9: A third reading view keeps the old colors

Summary: `lesson-sentence-preview.tsx` still uses red for playing and blue for
both hover and selected.

Evidence:

- `apps/reading-advantage/components/lesson/lesson-sentence-preview.tsx:199` — hover `bg-blue-200`
- `apps/reading-advantage/components/lesson/lesson-sentence-preview.tsx:202` — playing `bg-red-200`
- `apps/reading-advantage/components/lesson/lesson-sentence-preview.tsx:587` — selected `bg-blue-200`

FR-7 names the article and the stories components only, so this file is outside
the requirement. The defect that the audit described stays in this third view.
Record it for a later track.

### Low 10: `useAudioSegment` does not reload the element when the URL changes

Summary: The hook re-registers listeners on a URL change, but it never assigns
`audio.src` and never calls `audio.load()`.

Evidence:

- `apps/reading-advantage/hooks/use-audio-segment.ts:34-59`
- `apps/reading-advantage/components/audio-img.tsx:34-36` — the URL comes from a `<source>` child
- `apps/reading-advantage/components/audio-button.tsx:35-37` — the same pattern

A media element does not reload when a `<source>` child changes. If the parent
keeps the component mounted and changes `audioUrl`, the old clip plays.

### Low 11: The hook files use a different indentation from the components

Summary: `hooks/use-audio.ts` and `hooks/use-audio-segment.ts` use four spaces.
The components use two spaces.

Evidence: `apps/reading-advantage/hooks/use-audio.ts:33`,
`apps/reading-advantage/hooks/use-audio-segment.ts:24`.

`measure/code_styleguides/general.md` asks for consistent formatting. The
default exports in both hooks differ from
`measure/code_styleguides/typescript.md` section 1, but the repository uses
default exports for every hook, so the hooks follow the local pattern.

## Requirement Coverage

| FR | Status | Evidence |
| --- | --- | --- |
| FR-1 Remove the duplicated audio-loading effect | Implemented | Commit `bfd1f06` deleted the effect. `components/article-content.tsx` now holds only the article-reset effect at line 334. The duplicate returns inside the hook; see Finding 3. |
| FR-2 Fix playback-speed switching | Partly implemented | `hooks/use-audio.ts:209` no longer lists `speed`. `hooks/use-audio.ts:102` sets `playbackRate` in the handler. `hooks/use-audio.ts:193` sets it again on `loadedmetadata`. `playFromIndex` at lines 54-72 omits it; see Finding 4. |
| FR-3 Remove the double-advance race | Implemented as written, wrong for this app | `hooks/use-audio.ts:142-166` holds exactly one advance path for each mode. Commit `a7ea1b0` repaired the fallback path with `advanceToNext`. The chosen path breaks articles and stories; see Finding 1. |
| FR-4 Merge the two `useAudio` hooks | Implemented | `hooks/use-audio.ts` exists. Commit `98c11a9` deleted `hooks/stories-chapter/useAudio.ts` and `hooks/article-content/useAudio.ts`. `hooks/use-audio.ts:68-69` attaches `canplaythrough` before `load()`. The listener removal is incomplete; see Finding 5. |
| FR-5 Fix phase3 first-reading tracking | Partly implemented | `components/lesson/phases/phase3-first-reading.tsx` holds no `setInterval`, no `requestAnimationFrame`, and no `console.log`. The single `timeupdate` listener is at line 244. Four other reading components keep `console.log`; see Finding 6. |
| FR-6 Extract a shared audio-segment hook | Implemented | `hooks/use-audio-segment.ts:34-59` uses `timeupdate` and removes both listeners and pauses the element in the cleanup. `components/audio-img.tsx` and `components/audio-button.tsx` hold no `setInterval`. `hooks/use-audio-segment.ts:64-69` makes pause stop the clip. |
| FR-7 Fix highlight color semantics | Implemented | `lib/sentence-highlight.ts` defines four constants. `components/article-content.tsx:140-145` and `components/stories-chapter-content.tsx:139-145` import them. Playing is amber, hover is emerald, selected is blue. The comment is not accurate; see Finding 8. |
| FR-8 Fix the stories save-to-flashcard flow | Implemented | `components/stories-chapter-content.tsx:192-211` requests the four languages, awaits `Promise.all`, and then posts one save request at line 224. The `finally` block at line 271 clears the loading flag. |

## Acceptance Criteria

| AC | Pass/Fail | Evidence |
| --- | --- | --- |
| AC-1 Each audio track loads exactly once per change | Fail | Findings 2 and 3. A probe measured three extra `load()` calls for three extra renders, and two `load()` calls for one advance. |
| AC-2 Changing playback speed does not restart the current sentence | Fail | `handleSpeedTime` alone touches no `src` (`hooks/use-audio.ts:98-104`), so the hook passes in isolation. In the real components `setSpeed` causes a render, and Finding 2 then pauses and reloads the clip. |
| AC-3 No sentence is skipped during playback at 1x, 1.5x, and 2x | Fail | Finding 1. Articles and stories advance one time per audio file, so the player holds the highlight on one sentence for the whole article. |
| AC-4 One shared `hooks/use-audio.ts` serves both views | Pass | `components/article-content.tsx:36` and `components/stories-chapter-content.tsx:41` both import `@/hooks/use-audio`. The two old hook files are deleted. |
| AC-5 Phase3 uses only `ontimeupdate` | Pass | `components/lesson/phases/phase3-first-reading.tsx:175-221` holds the single tracker. A grep for `setInterval` and `requestAnimationFrame` in that file returns nothing. |
| AC-6 No `setInterval` in the two audio components; unmount stops timers and audio | Pass | `components/audio-img.tsx` and `components/audio-button.tsx` hold no timer. `hooks/use-audio-segment.ts:54-58` removes both listeners and pauses the element. The track test at line 272 confirms this. |
| AC-7 Three distinct background colors in the article and stories views | Pass | `lib/sentence-highlight.ts:12-20` gives emerald for hover, amber for playing, and blue for selected. Both views use the constants. |
| AC-8 One click saves the sentence with all four translations | Pass | The track test at `__test__/audio-highlight-correctness.test.tsx:338-392` asserts one save request, four translate requests, and a translation object with `th`, `zh-CN`, `zh-TW`, and `vi`. The test passes. |

## Plan Accuracy

1. Phase 1 carries three checked boxes and no commit hash. The work is real, but
   it landed inside the Phase 3 commits. The merged hook contract is the JSDoc
   and the `UseAudioOptions` type in `hooks/use-audio.ts:12-32` (commit
   `98c11a9`). The segment hook contract is the JSDoc in
   `hooks/use-audio-segment.ts:10-18` (commit `a27f9f1`). The shared highlight
   constant is `lib/sentence-highlight.ts` (commit `c839061`). The track
   directory holds no separate contract document. Add those three hashes to the
   Phase 1 tasks.

2. `metadata.json` states `"status": "new"` and `"actual_tasks": null`. Nine of
   the ten Phase 3 tasks are complete. Update both fields.

3. The Phase 3 task "Run new tests until green; run
   `pnpm turbo run test --filter=reading-advantage` and `check-types`" is
   checked. No commit and no note records the result of the two package-level
   commands. The new test file passes; see the next section.

4. The spec section "Out of Scope" asks for a `measure/tech-debt.md` row if the
   fallback timing still drifts. `measure/tech-debt.md` holds no row for this
   track. The Phase 4 task that owns the row is unchecked, so the item is open,
   not skipped.

5. The remaining unchecked boxes match reality. The Phase 3 manual verification
   and all four Phase 4 tasks are open. The audit document
   `docs/reading-advantage-ux-refactor-plan.md` still shows the Phase 1 items as
   open.

6. No checked box describes work that is absent, and no unchecked box describes
   work that is complete.

## Test Result

Command:

```
cd apps/reading-advantage && CI=true npx jest __test__/audio-highlight-correctness.test.tsx 2>&1 | tail -50
```

Output summary (verbatim tail):

```
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        18.619 s
Ran all test suites matching __test__/audio-highlight-correctness.test.tsx.
```

The run also printed jsdom console noise, for example
`Error: Not implemented: HTMLMediaElement.prototype.pause` from
`hooks/use-audio.ts:206`. The noise does not fail the suite.

Finding 7 explains why the green result does not prove Findings 1, 2, and 3 are
absent.

## Verdict

STOP. The track has two Critical findings and two High findings. Correct these
before the track continues:

1. Critical 1 — The highlight stays on one sentence, because one article has one
   combined audio file and `ended` fires one time. Select the advance path by
   the audio file layout, not by the presence of timepoints.
2. Critical 2 — The hook reloads and pauses the audio on every render, because
   the effect depends on the `sentenceList` array identity.
3. High 3 — `playFromIndex` and the loading effect load the same clip two times.
4. High 4 — `playFromIndex` loses the selected playback speed.

Also correct Finding 7 in the same work. The current test asserts the behavior
that Finding 1 describes, so the suite blocks the repair.
