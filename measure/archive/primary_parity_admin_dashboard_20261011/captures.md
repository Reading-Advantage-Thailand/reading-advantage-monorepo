# Captures — primary_parity_admin_dashboard_20261011, Phase 1: Design

The PNG files stay outside the repository. Folder:
`/home/daniebo/Desktop/primary-parity-progress/captures/admin_dashboard/phase1-design/`

How they were made: an isolated harness (not in the repository) bundles the real `Scene`, `Panel`, `Sign`, and `Meter`
(`apps/primary-advantage/components/rpg/*`) and the real stylesheet (`styles/globals.css`, `styles/rpg.css`) with fixture
props, then renders with headless `/usr/bin/google-chrome` through `playwright-core`. The staff shell (header, 230 px sidebar,
bottom bar) is a stand-in with the classes of `components/shared/app-layout.tsx`. The harness source is in
`/tmp/claude-1000/-home-daniebo-Desktop-reading-advantage-monorepo/dd704fda-3c3a-4a4b-812c-8ee53fdda1f8/scratchpad/adm-design/`
(`page.tsx` holds the panels; `fixtures.ts` holds the demo values; `build.mjs` runs it). Data: a fictional "Demo School".
No real name or real number appears.

File names: `<variant>-<day|night>-<375|1280>.png` is the first screen. `-s1`, `-s2`, `-s3` are the same page scrolled
by one, two, and three screens.

| Variant | Files |
| --- | --- |
| ADMIN, 30 days, CEFR (main) | `admin-day-375`, `admin-day-1280`, `admin-night-375`, `admin-night-1280` (+ `-s1` to `-s3` day, `-s1` night) |
| SYSTEM without a school ("Choose a school") | `system-choose-day-375`, `-1280`, `system-choose-night-375`, `-1280` |
| SYSTEM with a school chosen (selector at the top) | `system-chosen-day-375`, `system-chosen-day-1280` |
| ADMIN, 90 days, adoption by class grade | `admin-grade-90-day-375`, `-1280` (+ `-s1` to `-s3`) |
| ADMIN, 7 days | `admin-7-day-375`, `-1280` (+ `-s1`, `-s2`) |
| ADMIN, empty school | `admin-empty-day-375`, `-1280` (+ `-s1`) |

Manual verification (owner look check, async):

1. Open the main captures at 375 px and 1280 px, day and night. Check that each label names the metric it shows.
2. Check the order: range signs, key numbers, alerts, adoption, teachers, activity by day.
3. Check the activity grid: one cell for each day, today with the gold outline, the count readable in each cell.
4. Check the SYSTEM captures: the selector is labeled "School"; "Choose a school" shows with no numbers.
5. Check the empty school: no zeros in the key numbers panel.
6. Check the values in the spec section "Values for the Owner's Look Check". Default used (owner decision 2026-10-12: no stop).

## Phase 3: UI

Folder: `/home/daniebo/Desktop/primary-parity-progress/captures/admin_dashboard/phase3-ui/`

How they were made: the harness bundles the real page function (`app/[locale]/admin/dashboard/page.tsx`) and its real panels with
the real `Scene`, `Panel`, `Sign`, and `Meter`, and the real stylesheet. Stubs replace the session, the database, the domain call
(the data is a fictional "Demo School"), and the school list. The staff shell is a stand-in. Headless `/usr/bin/google-chrome`
through `playwright-core`. The harness source is in
`/tmp/claude-1000/-home-daniebo-Desktop-reading-advantage-monorepo/dd704fda-3c3a-4a4b-812c-8ee53fdda1f8/scratchpad/admin_dashboard-p3/`.
The school list is empty in the harness, so the SYSTEM selector shows no school name; the real page shows the school name.

File names: `<variant>-<day|night>-<375|1280>.png`; `-s1`, `-s2`, `-s3` are the same page scrolled by one, two, and three screens.

| Variant | Files |
| --- | --- |
| ADMIN, 30 days, CEFR | `admin-day-375`, `admin-day-1280`, `admin-night-375`, `admin-night-1280` (+ `-s1` to `-s3` day, `-s1`, `-s2` night) |
| SYSTEM without a school | `system-choose-day-375`, `-1280`, `system-choose-night-375`, `-1280` |
| SYSTEM with a school | `system-chosen-day-375`, `system-chosen-day-1280` |
| ADMIN, 90 days, class grade | `admin-grade-90-day-375`, `-1280` (+ `-s1` to `-s3`) |
| ADMIN, 7 days | `admin-7-day-375`, `-1280` (+ `-s1`, `-s2`) |
| ADMIN, critical alerts | `admin-critical-day-375`, `-1280` |
| ADMIN, empty school | `admin-empty-day-375`, `-1280` (+ `-s1`) |

Manual verification (owner look check, async): see the Phase 3 notes in `plan.md`.

