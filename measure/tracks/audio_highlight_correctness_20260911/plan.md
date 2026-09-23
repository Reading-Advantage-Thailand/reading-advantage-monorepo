# Implementation Plan: Reading Audio and Highlighting Correctness

Track ID: `audio_highlight_correctness_20260911`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/`.

## Phase 1: Contract & Invariant Definition

- [x] Task: Define the shared audio-hook contract
  - [x] Write the TypeScript interface for the merged `hooks/use-audio.ts`: inputs (track list, speed, current index), outputs (play, pause, playFromIndex, currentSentence, onSentenceChange), and the `canplaythrough`-before-`load()` ordering rule.
  - [x] Write the `useAudioSegment(url, start, end)` hook contract: native `timeupdate` drive, cleanup on unmount, stop-not-restart pause semantics.
  - [x] Define one shared highlight-class constant (playing / hover / selected) in a single module both content components import.

## Phase 2: Test

- [x] Task: Write failing audio-hook tests (Red) (1e3fc4d)
  - [x] Test: audio element `src` is assigned once per track change; speed change sets `playbackRate` without touching `src` (mock HTMLAudioElement).
  - [x] Test: only one advance path fires per sentence end (no double increment).
  - [x] Test: `playFromIndex` attaches `canplaythrough` before `load()`.
  - [x] Test: `useAudioSegment` registers `timeupdate` and removes listeners and timers on unmount.
  - [x] Test: stories save-to-flashcard awaits translation then saves four languages in one click.

## Phase 3: Implement

- [x] Task: FR-1 delete the duplicated audio effect in `components/article-content.tsx` (bfd1f06)
- [x] Task: FR-2 speed switching via `playbackRate` in `hooks/article-content/useAudio.ts` (8e9480e)
- [x] Task: FR-3 single sentence-advance path in the audio hook (50f6b0c, a7ea1b0)
- [x] Task: FR-4 merge both `useAudio` hooks into `hooks/use-audio.ts`; update article and stories imports (98c11a9)
- [x] Task: FR-5 phase3 uses `ontimeupdate` only; delete interval/rAF trackers and `console.log` calls (1d8f0f0)
- [x] Task: FR-6 extract `useAudioSegment`; rewrite `audio-img.tsx` and `audio-button.tsx` on it (a27f9f1)
- [x] Task: FR-7 shared highlight-class constant; apply in article and stories content components (c839061)
- [x] Task: FR-8 stories save-to-flashcard awaits translation and saves four languages (5542974)
- [x] Task: Run new tests until green; run `pnpm turbo run test --filter=reading-advantage` and `check-types`
- [x] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md) — PASSED 2026-09-23: session S5 checks S5.7-S5.11 (owner manual verification run 2026-09-23): highlight advances sequentially 0->1->2 with no skipped sentences under simulated timeupdate (seed-article TTS audio 403s locally — environment gap); playbackRate changes at 1.5x/2x leave audio.currentTime untouched (no sentence restart); playing/hover/selected use three distinct colors (amber/emerald/blue) from the shared constants in both article and stories views; useAudioSegment pause halts without restart and leaks no intervals; stories save-to-flashcard awaits all four translations in one click (code-verified; no stories seeded locally). Confirmed by explicit product-owner yes on 2026-09-23.

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/reading-advantage-ux-refactor-plan.md` Phase 1 items to done
- [ ] Task: If fallback timing (missing timepoints) still drifts, add a `measure/tech-debt.md` row with owner confirmation
- [ ] Task: Run available doctor/lint gates for reading-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
