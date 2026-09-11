# Specification: Reading Audio and Highlighting Correctness

Track ID: `audio_highlight_correctness_20260911`. Type: bug. App: `apps/reading-advantage`.

## Overview

The 2026-09-11 UX audit found that sentence highlighting and audio playback are implemented four separate times with defects that cause highlight lag, skipped sentences, audio drift, and leaked timers. Evidence: `docs/reading-advantage-ux-refactor-plan.md` section 2.1. This track makes the read-aloud experience correct by consolidating on one audio hook and fixing the playback races. No new dependencies.

## Functional Requirements

### FR-1: Remove the duplicated audio-loading effect

`components/article-content.tsx` lines 342-368 duplicate the audio effect in `hooks/article-content/useAudio.ts` lines 169-195. The audio element loads twice per track change. Delete the effect in `article-content.tsx`. The hook owns audio loading.

### FR-2: Fix playback-speed switching

Speed changes currently re-assign `audio.src` and restart the sentence. Remove `speed` from the audio-loading effect dependency array in `useAudio`. Set `audio.playbackRate` in the speed-change handler instead.

### FR-3: Remove the double-advance race

Both `onEnded` and `handleTimeUpdate` advance the sentence index. Keep exactly one advance path. Prefer `onEnded` when timepoints exist; keep the timeupdate check only for the fallback timing mode.

### FR-4: Merge the two `useAudio` hooks

`hooks/article-content/useAudio.ts` and `hooks/stories-chapter/useAudio.ts` are about 95% identical. Merge them into one `hooks/use-audio.ts`. Extract one `playFromIndex(index)` helper that attaches the `canplaythrough` listener before `audio.load()`. Use the phase5 deep-reading implementation as the behavioral model.

### FR-5: Fix phase3 first-reading tracking

`lesson/phases/phase3-first-reading.tsx` tracks the current sentence with `setInterval`, `requestAnimationFrame`, and `ontimeupdate` together, each calling `scrollIntoView`. Delete the interval and the rAF loop. Keep `ontimeupdate`. Remove the `console.log` calls in phase3 and the other reading components listed in the audit.

### FR-6: Extract a shared audio-segment hook

`audio-img.tsx` and `audio-button.tsx` each poll playback position with 5-10ms `setInterval` timers and leak them on unmount. Extract one `useAudioSegment(url, start, end)` hook that uses the native `timeupdate` event and clears timers in effect cleanup. Make both components thin buttons over this hook. Fix `audio-img.tsx` so pause stops the clip instead of restarting it.

### FR-7: Fix highlight color semantics

Playing, hover, and selected states must be visually distinct. Playing currently uses `bg-red-200` while hover and selected share `bg-blue-200`. Define one shared highlight-class constant used by both article and stories content components.

### FR-8: Fix the stories save-to-flashcard flow

`stories-chapter-content.tsx` saves only the Thai translation and requires two clicks. Make the save flow await translation, then save. Align the translation object with the four-language shape used by `article-content.tsx`.

## Non-Functional Requirements

- NFR-1: No new dependencies. Use the native HTMLAudioElement API.
- NFR-2: Highlight must track audio within one sentence boundary at 1x and 2x speed.
- NFR-3: No polling intervals remain in audio components after this track.

## Acceptance Criteria

- AC-1: Each audio track loads exactly once per change (verify via network tab or a load-event spy in tests).
- AC-2: Changing playback speed does not restart the current sentence.
- AC-3: No sentence is skipped during playback at 1x, 1.5x, and 2x.
- AC-4: One shared `hooks/use-audio.ts` serves both article and stories reading views.
- AC-5: Phase3 uses only `ontimeupdate` for highlight tracking; no interval or rAF tracker remains.
- AC-6: `audio-img.tsx` and `audio-button.tsx` contain no `setInterval`; unmounting stops timers and audio.
- AC-7: Playing, hover, and selected sentences have three distinct background colors in both article and stories views.
- AC-8: One click on "Save to flashcard" in the stories view saves the sentence with all four translations.

## Out of Scope

- The shared `getTranslateSentence` helper extraction. Track `component_deduplication_20260911` owns that.
- Keyboard and visible-button alternatives to context-menu actions. Track `structural_ux_alignment_20260911` owns the a11y pass.
- Fallback timing redesign when timepoints are missing. Record in `measure/tech-debt.md` if not fixed as part of FR-3.
