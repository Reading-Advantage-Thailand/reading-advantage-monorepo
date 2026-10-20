# Captures — Phase 1: Design

Look check pending (owner, async). The PNG files are outside the repository.
Folder: `/home/daniebo/Desktop/primary-parity-progress/captures/quick_fixes/phase1-design`

Method: an esbuild bundle of the real components (`components/rpg/chrome.tsx`, `scene.tsx`, `components/ui/*`,
`@reading-advantage/ui`) with fixture text, the real CSS (`styles/globals.css`, `styles/rpg.css`), and the real
Forge backdrops. Headless Chrome ran the captures under the heavy lock. No Next server and no database ran.
Helper scripts: `/tmp/claude-1000/-home-daniebo-Desktop-reading-advantage-monorepo/dd704fda-3c3a-4a4b-812c-8ee53fdda1f8/scratchpad/qf-harness/` (not in the repository).
Fixture data is demo text only.

Name pattern: `student-<piece>-<day|night>-<375|1280>.png` and `staff-<piece>-day-<375|1280>.png`.

| FR | Piece | Files (prefix `/home/daniebo/Desktop/primary-parity-progress/captures/quick_fixes/phase1-design/`) |
| --- | --- | --- |
| FR-8 | Settings, display name | `student-fr8-settings-display-name-{day,night}-{375,1280}.png` |
| FR-8 | Settings, code-only error | `student-fr8-settings-code-only-error-{day,night}-{375,1280}.png` |
| FR-9, FR-11 | Article, 3 blocks, chip Saved | `student-fr9-fr11-article-saved-{day,night}-{375,1280}.png` |
| FR-9, FR-11 | Article, chip Not saved | `student-fr9-fr11-article-not-saved-{day,night}-{375,1280}.png` |
| FR-11 | Chip states | `student-fr11-chip-states-{day,night}-{375,1280}.png` |
| FR-7 | Lesson task 8, saved answer | `student-fr7-lesson-task8-saved-answer-{day,night}-{375,1280}.png` |
| FR-13 | Sign-in, prefilled code | `student-fr13-signin-prefilled-{day,night}-{375,1280}.png` |
| FR-13 | Sign-in, old link note | `student-fr13-signin-old-link-note-{day,night}-{375,1280}.png` |
| FR-1 | Admin edit class dialog | `staff-fr1-admin-edit-class-day-{375,1280}.png` |
| FR-1 | Admin edit class, name error | `staff-fr1-admin-edit-class-name-error-day-{375,1280}.png` |
| FR-3 | Reports, four tiles | `staff-fr3-reports-four-tiles-day-{375,1280}.png` |
| FR-2 | Students toast, success | `staff-fr2-toast-success-day-{375,1280}.png` |
| FR-2 | Students toast, error with description | `staff-fr2-toast-error-day-{375,1280}.png` |

Q1 and Q2: default used (owner decision 2026-10-12: no stop). The edit dialog capture shows no "Student password"
field (Q1). The old-link capture shows the note (Q2).

Not captured here: FR-12 (footer). The design is one link change: "Support" goes to `/contact`, the email stays
`support@reading-advantage.com`. It lands on branch `primary/public-pages` (spec FR-12).
