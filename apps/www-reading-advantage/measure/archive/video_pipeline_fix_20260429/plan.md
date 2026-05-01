# Implementation Plan: Video Pipeline Structural Fixes

## Phase 1: Fix Thai Text Wrapping in Intro/Outro
- [x] Task: Fix `renderIntroClip` ffmpeg fallback to use `wrapText()` for text wrapping
    - [x] Dynamic maxCharsPerLine based on font size and frame width
    - [x] Tested with Thai text calculations
- [x] Task: Fix `renderOutroClip` ffmpeg fallback to use `wrapText()` for CTA text wrapping
    - [x] Dynamic maxCharsPerLine based on font size and frame width

## Phase 2: Fix Audio/Video Length Synchronization (Architecture Rewrite)
- [x] Task: Rewrite `createSegmentClip` to embed audio in each segment
    - [x] Accept audioPath parameter
    - [x] Mux audio with video during clip creation
    - [x] Each segment is now self-contained with video + audio
- [x] Task: Add silent audio tracks to intro/outro for concat compatibility
    - [x] Revideo output gets silent audio muxed after render
    - [x] FFmpeg fallback generates silent audio track
- [x] Task: Remove separate audio concat + mux steps from main()
    - [x] Removed Step 3 (Build full narration audio)
    - [x] Removed Step 8 (Mux narration audio)
    - [x] Simplified to: intro → segments (with audio) → outro → concat → upscale → jingle

## Phase 3: Fix Jingle Mixing
- [x] Task: Simplify `mixBackgroundMusic` since audio is already embedded
    - [x] Removed padding/extraction steps
    - [x] Direct amix with jingle (both same duration now)
    - [x] amix=duration=first works correctly when inputs match

## Phase 4: Harden Image Generation
- [x] Task: Update image prompt to explicitly reject text/charts/graphs
    - [x] Added negative terms: charts, graphs, diagrams, numbers, UI, screens
    - [x] Explicit instruction: ONLY show real-world scenes
- [x] Task: Validate segment `imageDescription` doesn't contain prohibited terms
    - [x] Added warning check for prohibited terms

## Phase 5: Output Verification
- [x] Task: Add post-render verification checks
    - [x] Video and audio duration comparison
    - [x] Audio/video sync PASS/FAIL reporting
