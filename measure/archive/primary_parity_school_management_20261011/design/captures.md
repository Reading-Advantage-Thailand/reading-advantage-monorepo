# Captures — primary_parity_school_management_20261011, Phase D: Design

The PNG files stay outside the repository. Folder:
`/home/daniebo/Desktop/primary-parity-progress/captures/school_management/phaseD-design/`

How they were made: an isolated harness (not in the repository) bundles the real `Scene`, `Panel`, `Sign`, `Meter`, and
`RpgButton` (`apps/primary-advantage/components/rpg/*`) and the real stylesheet (`styles/globals.css`, `styles/rpg.css`)
with fixture props. Headless `/usr/bin/google-chrome` renders them through `playwright-core`, under the heavy lock. The
staff shell and the dialog frame are stand-ins with the classes of `components/shared/app-layout.tsx` and
`components/ui/dialog.tsx`. The harness source is in
`/tmp/claude-1000/-home-daniebo-Desktop-reading-advantage-monorepo/dd704fda-3c3a-4a4b-812c-8ee53fdda1f8/scratchpad/school-mgmt-D/`
(`page.tsx`, `render.tsx`, `build.mjs`). Data: a fictional "Demo School", "Harbor Primary", and fictional names. No real name appears.

File names: `<variant>-<375|1280>.png`; `-s1`, `-s2` are the same page scrolled by one and two screens.
Each main variant has a day and a night file. The dialogs keep the current shadcn frame; only the new parts use the skin.

| Story | Variant | Files (prefix) |
| --- | --- | --- |
| S1 | Teacher picker, ADMIN (owner row "Class owner", locked) | `s1-picker-admin-{day,night}` |
| S1 | Picker, SYSTEM (title line names the school) | `s1-picker-system-day` |
| S1 | Picker, server refusal (teacher of another school) | `s1-picker-error-day` |
| S2 | Import, SYSTEM, no school chosen (upload off) | `s2-import-system-blocked-{day,night}` |
| S2 | Import, SYSTEM, school chosen, result names the school | `s2-import-system-chosen-{day,night}` (+ `-s1` day) |
| S2 | Import, ADMIN (no selector) | `s2-import-admin-day` |
| S3 | Teachers, SYSTEM (school filter, school column) | `s3-teachers-system-{day,night}`, `s3-teachers-system-filtered-day` |
| S3 | Teachers, ADMIN (no filter, no column) | `s3-teachers-admin-day` |
| S3 | Edit dialog: school select, warning, classes of the new school | `s3-move-edit-{day,night}` |
| S3 | Move confirm step | `s3-move-confirm-{day,night}` |
| S3 | Move refused (owned classes, 409 with names) | `s3-move-refused-day` |
| S4 | License panel, seats, licenses, seat holders | `s4-license-ok-{day,night}` (+ `-s1`, `-s2`) |
| S4 | Over-limit warning | `s4-license-over-{day,night}` (+ `-s1` day) |
| S4 | No active license | `s4-license-none-day` (+ `-s1`) |
| S4 | School with no license and no students | `s4-license-empty-day` |

S5 has no visual change (the existing edit dialog keeps its role select).

Notes for the build:

- The edit dialogs scroll inside the dialog in the real app; the captures clip the long class list at 375 px on purpose.
- At 375 px the "Choose file" label wraps in the import upload row. Build the real row with a shorter label or a wrap rule.
- The pin of a pinned `Panel` inside a dialog is clipped by the dialog edge. Use `pinned` in dialogs only with top padding.

Manual verification (owner look check, async):

1. Open the S1 captures. Check that the owner row shows "Class owner" and cannot be unchecked, and that the check boxes are 48 px rows.
2. Open the S2 captures. Check that SYSTEM sees "Target school" first, that the upload is dimmed with a reason, and that ADMIN sees no selector.
3. Open the S3 captures. Check the school column and filter for SYSTEM only, the warning in the edit dialog, and the confirm step with "From", "To", "Leaves", "Joins".
4. Open the S4 captures. Check that "Seats used", "Seats free", and "Seats in total" read clearly, and that the over-limit warning names the count.
5. Check night mode for each main variant, and 375 px for horizontal overflow (the harness found none).
6. Check the defaults in the spec section "Defaults used for the member questions". Default used (owner decision 2026-10-12: no stop).
