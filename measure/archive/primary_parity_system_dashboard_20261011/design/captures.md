# Design captures — system dashboard (Phase 1)

The mocks use the real RPG components, the real CSS (`styles/globals.css`), and demo data with invented school
names. PNG files stay outside the repository.

Folder: `/home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/`
Harness source (for Phase 3 to port the markup): `/tmp/claude-1000/-home-daniebo-Desktop-reading-advantage-monorepo/dd704fda-3c3a-4a4b-812c-8ee53fdda1f8/scratchpad/system_dashboard-p1/` (`page.tsx` markup, `fixtures.ts`, `render.tsx`, `build.mjs`; run with `OUT=<folder> node build.mjs` under the heavy lock).

Each name has a `-375` (phone) and a `-1280` (desktop) file. A `-sN` suffix is the Nth scroll step.

| Variant | What it shows |
| --- | --- |
| home-day | Full page, day, default order (quiet first, then name) |
| home-night | Full page, night |
| sorted-seats-day | Sort by seats, descending (`aria-sort`, arrow) |
| search-day | Search "school" |
| search-none-day | Search with no match |
| no-unassigned-day | No note for students without a school |
| empty-day | No school: "No schools yet" |

Files: every `<variant>-375.png` and `<variant>-1280.png` in the folder, plus the scroll steps:
home-day-{375,1280}-s1 and -s2; home-night-{375,1280}-s1; sorted-seats-day-{375,1280}-s1; search-day-{375,1280}-s1.

Example absolute paths:

- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-night-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-night-1280.png

All files, absolute paths:

- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/empty-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/empty-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-day-1280-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-day-1280-s2.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-day-375-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-day-375-s2.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-night-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-night-1280-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-night-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/home-night-375-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/no-unassigned-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/no-unassigned-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/search-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/search-day-1280-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/search-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/search-day-375-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/search-none-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/search-none-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/sorted-seats-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/sorted-seats-day-1280-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/sorted-seats-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/system_dashboard/phase1-design/sorted-seats-day-375-s1.png
