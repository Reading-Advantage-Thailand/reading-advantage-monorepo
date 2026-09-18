# Specification: Memory — Client Quick Wins

Track ID: `reading_mem_client_quick_20260918`. Type: chore. App: `apps/reading-advantage`.

## Overview

Source: the 2026-09-18 "Read + Primary Advantage Student Routes" memory audit, item 8 and client findings C13, C14, C21. Every item cites a confirmed file and line.

## Functional Requirements

### FR-1: Release the article audio (audit item 8, C15)

`components/lesson/phases/phase3-first-reading.tsx` (lines 140-141, 253-262) and `components/lesson/phases/phase5-deep-reading.tsx` (lines 171-172): cleanup must set `audio.src = ""` so the decoded buffer is released. Keep the existing listener removal and pause.

### FR-2: Stop cache-busting the audio URL (audit item 8, C16)

`phase5-deep-reading.tsx` lines 160 and 169 append `?v=${Date.now()}` to the audio URL. Remove the cache-buster so the HTTP cache works.

### FR-3: Close the AudioContext (C13)

`hooks/useSound.ts` lines 16 and 34-36: the module keeps one AudioContext and never calls `close()`. Close it on unmount of the last consumer, or on page hide, without breaking concurrent games.

### FR-4: Release per-sound Audio objects (C14)

`hooks/useSound.ts` line 111: each sound creates an Audio object that is never released. Release after playback ends, or reuse a small pool. Minimal fix per the audit.

### FR-5: Reset the game store on unmount (C21)

`store/useGameStore.ts` line 15 with `phase10-vocabulary-matching.tsx` lines 122 and 236: the vocabulary list, missed words, and score stay in module scope after the student leaves. Reset on unmount.

## Non-Functional Requirements

- NFR-1: No playback behavior change. The audio-highlight tests from track `audio_highlight_correctness_20260911` must stay green.
- NFR-2: No new dependencies.

## Acceptance Criteria

- AC-1: Unit tests prove the audio element is released (`src === ""`) and the cache-buster is gone.
- AC-2: A unit test proves the AudioContext closes and the game store resets on unmount.
- AC-3: The full app Jest suite and `check-types` match the known baselines (2 failing suites, 8 tsc errors).

## Out of Scope

- Sprite resizing (planned track `reading_mem_sprites_20260918`).
- Lazy-loading lesson phases (planned track `reading_mem_lazy_bundles_20260918`).
