# Captures: Phase D design

Folder: `/home/daniebo/Desktop/primary-parity-progress/captures/lesson_repeat/phaseD-design`
File name: `<state>-<width>-<day|night>.png` with width 375 or 1280. The states are:
`student-summary-first`, `student-summary-attempt2`, `student-confirm`, `student-restarting`,
`student-preview`, `teacher-plan`, `teacher-confirm`, `teacher-grid`, `teacher-drilldown`.
That is 36 full-page files. Example:
`/home/daniebo/Desktop/primary-parity-progress/captures/lesson_repeat/phaseD-design/student-summary-attempt2-375-day.png`

Made on 2026-10-12 with the real chrome components, the real `rpg.css`, and the real `CELL_TONE`,
compiled with the Tailwind of the app, in headless `/usr/bin/google-chrome` through playwright-core
(scripts: `harness-build.mjs.txt`, `harness-shoot.mjs.txt`, source: `mock-source.tsx.txt`).
The staff header is a plain stand-in. The page font is the system font. The summary shows only
the top part and the action row of task 14: the real summary keeps its stat cards and quiz cards.
Check in every capture: no horizontal scroll and no skin button under 48 px (pass in all 36 files).
