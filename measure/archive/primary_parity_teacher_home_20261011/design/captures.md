# Design captures — teacher home (Phase 1)

The mocks use the real RPG components, the real CSS, the real `ClassBookSlot`, and the real
`messages/en.json`. The data is demo data with no real names. PNG files stay outside the repository.

Folder: `/home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/`
Harness source (for Phase 3 to port the markup): `/tmp/claude-1000/-home-daniebo-Desktop-reading-advantage-monorepo/dd704fda-3c3a-4a4b-812c-8ee53fdda1f8/scratchpad/teacher_home-p1/page.tsx` (markup), `fixtures.ts` (data), `render.tsx` (variants), `build.mjs` (run with `OUT=<folder> node build.mjs` under the heavy lock).

Each name has a `-375` (phone) and a `-1280` (desktop) file. A `-sN` suffix is the Nth scroll step.

| Variant | What it shows | Files |
| --- | --- | --- |
| home-day | Full page, day, default sort (class name, ascending) | home-day-375{,-s1,-s2,-s3}.png, home-day-1280{,-s1,-s2,-s3}.png |
| home-night | Full page, night | home-night-375{,-s1}.png, home-night-1280{,-s1}.png |
| sorted-students-day | Sort by students, descending (`aria-sort`, arrow) | sorted-students-day-375{,-s1}.png, sorted-students-day-1280{,-s1}.png |
| search-day | Search "class 5": two rows | search-day-375.png, search-day-1280.png |
| search-none-day | Search with no match: the status line | search-none-day-375.png, search-none-day-1280.png |
| empty-day | Teacher with no class: zeros, "No classes yet" | empty-day-375.png, empty-day-1280.png |

All files, absolute paths:

- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/empty-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/empty-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-day-1280-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-day-1280-s2.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-day-1280-s3.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-day-375-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-day-375-s2.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-day-375-s3.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-night-1280-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-night-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-night-375-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/home-night-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/search-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/search-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/search-none-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/search-none-day-375.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/sorted-students-day-1280-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/sorted-students-day-1280.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/sorted-students-day-375-s1.png
- /home/daniebo/Desktop/primary-parity-progress/captures/teacher_home/phase1-design/sorted-students-day-375.png
