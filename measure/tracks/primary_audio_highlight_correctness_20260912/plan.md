# Implementation Plan: Primary Audio and Highlighting Correctness

Track ID: `primary_audio_highlight_correctness_20260912`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/primary-advantage/`. Run after `primary_authorization_hardening_20260912`. May run in parallel with `primary_broken_ux_fixes_20260912`.

## Phase 1: Contract & Schema Definition

- [x] Task: Define the shared audio-hook contract
  - [x] Write the TypeScript interface for `useAudioSegment(url, start, end)`: native `timeupdate` drive, `load()` on URL change, zero `end` means play to the end, cleanup on unmount.
  - [x] Define the highlight-timer contract: one ref, `clearTimeout` on pause, seek, sentence change, and unmount.
  - [x] Define one shared highlight-class constant (playing / hover / selected) for both themes.
  - [x] Write static tests (Red): no `setInterval` in `audio-button.tsx`; highlight helpers store a timeout handle; flashcard actions and game components share audio field names.

## Phase 2: Test

- [x] Task: Write failing audio tests (Red)
  - [x] Test: highlight timer is cleared on pause and on unmount (fake timers).
  - [x] Test: `useAudioSegment` registers `timeupdate` and removes listeners and timers on unmount.
  - [x] Test: `AudioButton` calls `load()` when the URL changes.
  - [x] Test: `endTimestamp === 0` does not stop playback at once.
  - [x] Test: word-order games index `words` with the word index.
  - [x] Test: the cloze hint plays when `startTime` is 0 and does not wait for `seeked`.
  - [x] Test: no playback timer fires after pause, player close, or unmount.
  - [x] Confirm all new tests fail (Red).

## Phase 3: Implement

- [x] Task: FR-1 hold the highlight timer in a ref; clear it on pause, seek, sentence change, and unmount
- [x] Task: FR-2 extract `useAudioSegment`; rewrite `AudioButton` as a thin button over it
- [x] Task: FR-3 call `load()` on URL change; treat zero `endTimestamp` as play-to-end
- [x] Task: FR-4 align `audio_url` / `audioUrl` field names between `actions/flashcard.ts` and the two game components
- [x] Task: FR-5 fix the word index in `order-words-game.tsx` and `lesson-sentence-order-word.tsx`
- [x] Task: FR-6 call `audio.pause()` inside `cleanup()` in the two sentence-order games
- [x] Task: FR-7 hold detached `new Audio()` objects in a ref and pause them on unmount
- [x] Task: FR-8 rename the client bucket variable or serve the URL from the server
- [x] Task: FR-9 delete `currentTime` state; drive `isPlaying` from `onPlay`/`onPause`; restore `setIsAudioLoaded(true)`
- [x] Task: FR-10 three distinct highlight colours in both themes (dark-theme playing and hover share a hue today)
- [x] Task: FR-11 serve real cloze segment times; drop the `seeked` wait at position 0; fix the deck cloze `any`-cast audio fields
- [x] Task: FR-12 cancel the word-click playback timer; clear the highlight chain on player close
- [x] Task: FR-13 pause `AudioButton` on unmount
- [x] Task: FR-14 remove the whole-article `console.log`; rename the `TaskFirstReading` export in `task-deep-reading.tsx`
- [x] Task: Run new tests until green; run `pnpm turbo run test --filter=primary-advantage` and `check-types`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [x] Task: Update `docs/primary-advantage-ux-refactor-plan.md` section 3 items to done
- [x] Task: Run available doctor/lint gates for primary-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
