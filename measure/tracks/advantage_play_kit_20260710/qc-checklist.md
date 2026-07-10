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

- [ ] Prompt and answer labels are readable at desktop and 390×844.
- [ ] Keyboard/mouse and touch controls are understandable and responsive.
- [ ] Correct and incorrect answers produce clear, pedagogically sound feedback.
- [ ] Pause, resume, mute, restart, clean relaunch, and cartridge switching work.
- [ ] No canvas, listener, audio, timer, or WebGL context accumulates after repeated switches.
- [ ] Required semantic slots and edition treatment feel appropriate for the audience.
- [ ] The five-field result is plausible and mock server mapping excludes display XP.
- [ ] Console and diagnostic panel show no unexplained errors or asset failures.

## Current approval state

Automated QC is recorded by this track. Explicit visual/gameplay approval for all three cartridges in both editions remains a product-owner decision and is not claimed by automated tests.
