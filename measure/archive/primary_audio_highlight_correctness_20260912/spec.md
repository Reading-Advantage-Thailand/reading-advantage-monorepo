# Specification: Primary Audio and Highlighting Correctness

Track ID: `primary_audio_highlight_correctness_20260912`. Type: bug. App: `apps/primary-advantage`.

## Overview

The 2026-09-12 Primary UX audit found that this application has no `hooks/useAudio.ts`. Audio logic exists in six inline copies. The word-highlight timer chain has no cancel path. Evidence: `docs/primary-advantage-ux-refactor-plan.md` section 3. This track extracts one shared segment hook, cancels highlight timers, and fixes the playback defects that make lesson audio dead or wrong. No new dependencies.

This is not a port of `audio_highlight_correctness_20260911`. That track merged two existing hooks. This app has no shared hook to merge. Build the hook here.

Run after `primary_authorization_hardening_20260912`. May run in parallel with `primary_broken_ux_fixes_20260912`.

## Functional Requirements

### FR-1: Cancel the highlight timer chain

`articles/article-content.tsx:264-275`, `lesson/task/task-first-reading.tsx:152-163`, and `lesson/task/task-deep-reading.tsx:155-166` call `setTimeout(..., 100)` inside `highlightIntermediateWords` and store no handle. No `clearTimeout` exists in any of the three files.

Hold the highlight timer in a ref. Clear it on pause, seek, sentence change, and unmount. After a pause, a seek, or a word click, no second chain may write the same state.

### FR-2: Extract `useAudioSegment(url, start, end)`

`components/audio-button.tsx` polls with a 5 ms `setInterval`. Two sentence-order games poll with a 50 ms `setInterval`. Five game files construct `new Audio()` inside a Promise.

Extract one `useAudioSegment(url, start, end)` hook on the native `timeupdate` event. Make `AudioButton` a thin button over it. Clear listeners and timers in effect cleanup.

### FR-3: Fix `AudioButton` resource selection and zero end time

`components/audio-button.tsx:73-75` puts the URL on a `<source>` child and never calls `load()`. The resource-selection algorithm runs only at insertion. In the flashcard decks one instance serves every card, so the button plays the first card's audio with the current card's timestamps.

Call `load()` when the URL changes.

Line 46 tests `currentTime + 0.5 >= endTimestamp`. Two flashcard callers pass `endTime || 0`. Treat a missing or zero `endTimestamp` as "play to the end of the resource", not as "stop at once".

### FR-4: Align lesson audio field names

`actions/flashcard.ts:1112-1120` and `:1213-1223` return `audio_url`, `start_time`, `end_time`. `lesson-sentence-order.tsx:58-60` and `lesson-sentence-cloze-test.tsx:57-59` declare `audioUrl`, `startTime`, `endTime` as optional, so TypeScript reports nothing and the values are always `undefined`.

`actions/flashcard.ts:1112-1117` also returns `translationMap` while the client interface at `lesson-sentence-order.tsx:52-57` declares `translation`. The ordering hint translation is dead for the same reason.

Align all four field names so both lesson audio hints and the ordering translation hint play.

### FR-5: Fix the word-order index

`order-words-game.tsx:427,444,472` and `lesson-sentence-order-word.tsx:428,445,473` read `currentSentence.words[currentIndex]`, but `currentIndex` selects the sentence. Index words with the word index, not the sentence index.

### FR-6: Pause audio in sentence-order cleanup

`lesson-sentence-order.tsx:509` and `order-sentences-game.tsx:496` call `cleanup()` without `audio.pause()`. A sentence group longer than 10 seconds plays on through the rest of the article. Call `audio.pause()` inside `cleanup()`.

Move the success toast at `lesson-sentence-order.tsx:415-416` behind the audio-data validation. Users currently see a success toast followed by an error toast on every hint.

### FR-7: Hold detached `Audio` objects and pause them on unmount

Five detached `new Audio()` objects keep playing after the user navigates away. Hold them in a ref. Pause them on unmount.

### FR-8: Serve a readable storage bucket name

`lib/storage-config.ts:7` reads `process.env.STORAGE_BUCKET_NAME`. `cloudbuild.yaml:49` supplies it as a runtime server secret with no `NEXT_PUBLIC_` prefix, so every client caller uses the literal fallback `primary-app-storage`.

Rename the client-visible variable to `NEXT_PUBLIC_STORAGE_BUCKET_NAME`, or serve the URL from the server. Do not expose other secrets.

### FR-9: Drive playback state from element events

Delete the `currentTime` state that re-renders the whole article four times per second although the JSX never reads it. Drive `isPlaying` from `onPlay` and `onPause`. Make both speed selectors controlled. Move the lesson-task playback-rate handler off `timeupdate` onto `loadedmetadata`.

Uncomment or restore `setIsAudioLoaded(true)` in `task-first-reading.tsx` and `task-deep-reading.tsx` so the play button does not say "Loading" forever.

### FR-10: Distinct highlight colours

Give the playing, hover, and selected states three distinct colours in both themes. In dark theme the playing sentence uses `dark:bg-blue-900/70` and word hover uses `dark:hover:bg-blue-900/50`. The hue is the same; only the opacity differs. Give each state a distinct hue or a clearly distinct treatment.

### FR-11: Restore cloze hint timing data

The cloze hint is dead twice over. `actions/flashcard.ts:1209-1210` hardcodes `startTime = 0; endTime = 0`. The client at `lesson-sentence-cloze-test.tsx:610-629` sets `currentTime = startTime` on `loadeddata` and waits for `seeked`. When `startTime` is 0 and the element already sits at 0, no `seeked` event fires and `play()` never runs.

Serve real segment times from the server. Do not wait for `seeked` when the element already sits at the target time. The deck cloze route has the same defect through a different mechanism: `app/api/flashcard/decks/[deckId]/sentences-for-cloze/route.ts:99-101` reads `audioUrl` through an `any` cast that card rows do not carry. Fix both pipelines.

### FR-12: Cancel the word-click playback timer and clear the chain on close

`article-content.tsx:323-332` schedules an uncancelled 50 ms `setTimeout` that calls `play()` and `setIsPlaying(true)`. It fires after pause and after unmount. Hold it in the same timer ref as FR-1. `handleTogglePlayer` at `article-content.tsx:170-184` closes the player without clearing the in-flight highlight chain. Clear the chain on close.

### FR-13: Pause `AudioButton` on unmount

`audio-button.tsx:63-69` clears its interval on unmount but never pauses the element. A playing clip survives unmount. Pause the element in the same cleanup. The FR-2 hook must own this behavior.

### FR-14: Remove the article dump and rename the misnamed export

`task-deep-reading.tsx:194` logs the entire article object on every render. Remove it. Line 23 default-exports a component named `TaskFirstReading`. Rename it to `TaskDeepReading`.

## Non-Functional Requirements

- NFR-1: No new dependencies. Use the native HTMLAudioElement API.
- NFR-2: Highlight must track audio within one sentence boundary at 1x and 2x speed.
- NFR-3: No `setInterval` remains in an audio component after this track.

## Acceptance Criteria

- AC-1: The highlight tracks the audio within one sentence at 1x and 2x. Pause, seek, and word click cancel the previous timer chain.
- AC-2: No `setInterval` remains in an audio component.
- AC-3: Unmounting stops every timer and every clip.
- AC-4: Both lesson audio hints play with real segment times. Cloze-test no longer does nothing in the lesson or the deck pipeline. Sentence-order no longer always shows "Audio data not available".
- AC-5: `AudioButton` plays the current card's audio, not the first card's audio. A missing end timestamp does not stop playback at once.
- AC-6: Word-order hints play the current word.
- AC-7: Playing, hover, and selected sentences have three distinct background colours in light and dark themes.
- AC-8: `pnpm turbo run test --filter=primary-advantage` passes, except the known pre-existing APK failure.
- AC-9: No playback or highlight `setTimeout` fires after pause, player close, or unmount.

## Out of Scope

- Merging the three lesson/practice game pairs. Track `primary_component_deduplication_20260912` owns that. Extract the shared hook first so the later merge is smaller.
- Keyboard path for sentence-ordering. Track `primary_structural_alignment_20260912` owns a11y.
- Confirmed absent here: a double-advance race between `onEnded` and `handleTimeUpdate`; a speed change that restarts the sentence; `speechSynthesis` without `cancel()`; hand-built audio URLs; audio reload on every render. Do not port those reading-track fixes.
