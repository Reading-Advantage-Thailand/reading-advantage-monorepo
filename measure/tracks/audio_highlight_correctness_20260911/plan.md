# Implementation Plan: Reading Audio and Highlighting Correctness

Track ID: `audio_highlight_correctness_20260911`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/`.

## Phase 1: Contract & Invariant Definition

- [ ] Task: Define the shared audio-hook contract
  - [ ] Write the TypeScript interface for the merged `hooks/use-audio.ts`: inputs (track list, speed, current index), outputs (play, pause, playFromIndex, currentSentence, onSentenceChange), and the `canplaythrough`-before-`load()` ordering rule.
  - [ ] Write the `useAudioSegment(url, start, end)` hook contract: native `timeupdate` drive, cleanup on unmount, stop-not-restart pause semantics.
  - [ ] Define one shared highlight-class constant (playing / hover / selected) in a single module both content components import.

## Phase 2: Test

- [ ] Task: Write failing audio-hook tests (Red)
  - [ ] Test: audio element `src` is assigned once per track change; speed change sets `playbackRate` without touching `src` (mock HTMLAudioElement).
  - [ ] Test: only one advance path fires per sentence end (no double increment).
  - [ ] Test: `playFromIndex` attaches `canplaythrough` before `load()`.
  - [ ] Test: `useAudioSegment` registers `timeupdate` and removes listeners and timers on unmount.
  - [ ] Test: stories save-to-flashcard awaits translation then saves four languages in one click.

## Phase 3: Implement

- [ ] Task: FR-1 delete the duplicated audio effect in `components/article-content.tsx`
- [ ] Task: FR-2 speed switching via `playbackRate` in `hooks/article-content/useAudio.ts`
- [ ] Task: FR-3 single sentence-advance path in the audio hook
- [ ] Task: FR-4 merge both `useAudio` hooks into `hooks/use-audio.ts`; update article and stories imports
- [ ] Task: FR-5 phase3 uses `ontimeupdate` only; delete interval/rAF trackers and `console.log` calls
- [ ] Task: FR-6 extract `useAudioSegment`; rewrite `audio-img.tsx` and `audio-button.tsx` on it
- [ ] Task: FR-7 shared highlight-class constant; apply in article and stories content components
- [ ] Task: FR-8 stories save-to-flashcard awaits translation and saves four languages
- [ ] Task: Run new tests until green; run `pnpm turbo run test --filter=reading-advantage` and `check-types`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/reading-advantage-ux-refactor-plan.md` Phase 1 items to done
- [ ] Task: If fallback timing (missing timepoints) still drifts, add a `measure/tech-debt.md` row with owner confirmation
- [ ] Task: Run available doctor/lint gates for reading-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
