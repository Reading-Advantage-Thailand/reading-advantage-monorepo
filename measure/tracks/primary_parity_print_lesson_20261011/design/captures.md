# Captures: Phase D design

Folder: `/home/daniebo/Desktop/primary-parity-progress/captures/print_lesson/phaseD-design`
File name: `<state>-<width>-<day|night>.png`, width 375 or 1280. 28 full-page files.
States: `lesson-with-print` (button beside Projector and Rehearsal), `lesson-no-print` (no button, the
"not ready" line), `lesson-with-print-th` (Thai), `print-ready`, `print-loading` (gold Print disabled),
`print-not-ready`, `print-ready-th`.

Made on 2026-10-12 with the real `Panel`, `Sign`, `Bubble`, `Sprite`, `Scene`, `RpgButton`, `RpgLink`,
the real `TeacherPageHeader`, `buttonVariants`, and the real `styles/globals.css`. Headless
`/usr/bin/google-chrome` through playwright-core, under the heavy lock, `img.decode()` before each shot.
Scripts: `harness-build.mjs.txt`, `harness-shoot.mjs.txt`; mock: `mock-source.tsx.txt`.
The preview frame shows a neutral placeholder A4 sheet, not the Workbooks template. Demo data only.
Checks in all 28 files: no button under 48 px high, no horizontal scroll. The scene backdrop shows only
in the first screen height of a full-page shot (it is fixed); this is a capture effect.
