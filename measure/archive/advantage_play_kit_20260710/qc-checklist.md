# Advantage Games APK QC Checklist

Run `pnpm --filter vocabulary-games dev`, then open `http://localhost:3000/qc/`. This testbed is intentionally unauthenticated and never persists progress.

## Automated foundation evidence

- Package contracts, runtime, and cartridge tests pass.
- New-package line/statement coverage exceeds 80%.
- Architecture scan rejects legacy renderers, Next.js, auth, DB, and app-private imports.
- Production static build includes `/qc`.
- Browser smoke covers desktop, 390×844, edition switching, one-canvas lifecycle, no horizontal overflow, and real keyboard completion/result mapping.

## Product-owner pass for each cartridge

Repeat for Primary Chibi and Secondary Epic:

- [x] Prompt and answer labels are readable at desktop and 390×844.
- [x] Keyboard/mouse and touch controls are understandable and responsive.
- [x] Correct and incorrect answers produce clear, pedagogically sound feedback.
- [x] Pause, resume, mute, restart, clean relaunch, and cartridge switching work.
- [x] No canvas, listener, audio, timer, or WebGL context accumulates after repeated switches.
- [x] Required semantic slots and edition treatment feel appropriate for the audience.
- [x] The five-field result is plausible and mock server mapping excludes display XP.
- [x] Console and diagnostic panel show no unexplained errors or asset failures.

## Current approval state

Product-owner visual/gameplay QC for all three cartridges in both Primary Chibi and Secondary Epic was approved in this thread on 2026-07-10. The approval covers the foundation mechanics and edition treatments shown by the Advantage Games testbed; future public-ID or asset-pack changes still require the acceptance gates in their owning tracks.
