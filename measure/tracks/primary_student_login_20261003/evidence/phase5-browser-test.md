# Phase 5: 25-student browser test

Date: 2026-10-05. Local only: lane-b dev server on port 3100, database `primary_advantage` (migrations 0000-0064), headless Chromium.

## Setup

- `seed-login25.sql` adds "QA Login Class" (QA School A, teacher `qa-teacher-a`) with 25 students `qa-login-01` to `qa-login-25`.
- `login25.mjs` drives the browser. Step `setup` signs in the teacher and uses the real UI: Give picture passwords, Start class, Make class sheet, Make cards. Step `shots` takes the 375 px and 768 px screenshots. Step `students` signs in each student through the three paths (code with pictures, QR card, username with password). Step `extra` checks the roster count, the lockout and reset, the code-only setting, and End class.

## Results

| Step | Result |
|---|---|
| setup | PASS. Picture passwords for 25 students, class sheet with 25 rows (0 failed), 25 QR cards. The start response sends `Cache-Control: no-store`. |
| shots | PASS. 375 px and 768 px: no horizontal scroll, every control in `main` is 48 px or more. Screenshots in this folder (en and th). |
| students | NOT RUN TO THE END. Claude Code stopped the run because the machine was low on memory (other sessions used about 3 GB). No student sign-in finished. The rerun needs the owner's go-ahead. |
| extra | NOT RUN. |

Teacher class panel: `teacher-class-panel-1280.png` (the code in the picture belonged to a local class session that is closed).
