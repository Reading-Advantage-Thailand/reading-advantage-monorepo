# Captures: Phase 0 design

Folder: `/home/daniebo/Desktop/primary-parity-progress/captures/staff_student_view/phase0-design`
File name: `<state>-<width>-<day|night>.png` with width 375 or 1280. States: `banner` (the banner
beside the Reedy "Preview" label), `home`, `avatar`, `shop`, `history`, `reports`, `sentences`,
`vocabulary`, `quest`, `reedy`, `game-end`, `quiz-end`. That is 48 full-page files.

Made on 2026-10-12 with the real RPG components (`Banner`, `Panel`, `Plaque`, `Coins`, `Gem`,
`RpgLink`, `RpgButton`, `Scene`, `Sprite`) and the real `styles/globals.css`, compiled with the
Tailwind of the app. The shots ran in headless `/usr/bin/google-chrome` through playwright-core
under the heavy lock, with `img.decode()` before each shot (scripts: `harness-build.mjs.txt`,
`harness-shoot.mjs.txt`; mock: `mock-source.tsx.txt`). The header is a text stand-in. Demo data only.
Checks in all 48 files: no button under 48 px high, no horizontal scroll.
