# Lane C gate sweep (2026-10-05)

Browser sweep of the merged branch `primary/lane-de-teacher-books` (Lane C plus D+E) on the
local dev server (port 3100, QA school A). Harness: `scratchpad/sweep.mjs` (playwright-core,
headless Chromium); one browser context per role, because a second sign-in of the same student
ends the first session (Lane B rule). Each route at 375, 768, and 1280 px: HTTP status, final
path, document and `main` horizontal overflow, tap targets under 44 px inside `main`, axe
serious and critical violations (375 and 1280), the `h1`, raw i18n keys, loading markers, and a
full-page screenshot. Then a keyboard walk-through (student home at 1280 and 375, teacher my
classes, class roster, lesson). Inventory: `measure/qa/browser-2026-10-05/gates/inventory.json`;
PNGs stay out of Git.

Run history: run 1 was tainted after the first width by the session rule (archived). Run 2
crashed twice (Postgres killed by the OOM killer, then a machine restart) and resumed with
`MERGE=1`; the routes after the restart were captured in one process.

## Findings

Severity: Critical = a core flow is broken; High = a screen is wrong at one of the three widths
or fails an axe critical rule; Medium = a visible defect without a blocked flow; Low = polish.

| # | Sev | Route (role) | Width | Finding | Fix |
|---|-----|--------------|-------|---------|-----|
| G1 | High | `/student/reports` (student), `/teacher/student-progress/<id>` (teacher) | 768 | The date-range button of the activity chart is wider than its card: `main` scrolls 33 px sideways (document 17 px). | `components/dashboard/user-activity-chart.tsx`: the card and its content get `min-w-0`; the button is `w-full min-w-0 h-auto whitespace-normal`. |
| G2 | High | `/student/read/<id>` (student) | all | axe `button-name` (critical): the translation language select has no accessible name (flag emoji only). The page has no `h1` (the title was a `div` card title). | `article-content.tsx`: `aria-label` from the new `Components.translationLanguage` key (5 locales). `article-card.tsx`: the title is an `h1`. |
| G3 | High | `/` (public) | 375, 1280 | axe `button-name` (critical): the contact form inquiry select has a label but the trigger is not linked to it. | `(index)/page.tsx`: `SelectTrigger id="inquiry"` so the `Label htmlFor` applies. |
| G4 | Medium | `/student/home` (student) | 375, 1280 | axe `color-contrast` (serious): the leaderboard "You" is `text-green-500` on white (about 2.3:1). | `leaderboard.tsx`: `text-primary font-semibold` (brand-700, 5.3:1, Phase 1 decision). |
| G5 | Medium | `/student/history` (student) | 375 | axe `aria-prohibited-attr` (serious): `aria-label` on a plain `div` loading grid. | `history-list.tsx`: the grid is `role="status"`. |
| G6 | Low | `/` (public) | all | axe `color-contrast` on the glowing white logo text over the hero (3 nodes); contact inputs and buttons at 36 px. | Marketing page; not in the Lane C scope (owner item from Phase 1). |
| G7 | Low | `/student/read/<id>` | all | Five article controls at 36-40 px (listen, translate, word list, sentences). | `ArticleContent` internals are a Phase 2 non-goal; left for Lane G. |
| G8 | Low | `/teacher/dashboard`, `/teacher/my-students` | all | Student name links are 44 px tall but 18-35 px wide (inline text links in a 44 px row). | WCAG 2.5.8 accepts inline links; no change. |
| G9 | Low | `/teacher/class-roster/<id>` | all | The picture-password checkbox is 24 px (its label row is 48 px and clickable); the "Enroll Student" button is 36 px. | Lane B owns the checkbox; the enrollment button is a Lane C Phase 3 size miss, left as polish. |
| G10 | Low | `/settings/user-profile` | all | Legacy profile form: 36 px inputs, 32 px buttons, a 20 px back link. | Profile "Me" tab is an owner item (review notes). |
| G11 | Info | `/student/lesson/<id>`, `/b/o2/1` (student) | all | Flagged LOADING by the harness: the intro task's picture never loads (the QA article image returns 403 from storage) so its shimmer stays. The page itself renders (step rail, intro card, Start Lesson). | QA data; the task intro has no image fallback (task internals are a non-goal). |
| G12 | Info | `/student/games` (student) | 375, 768 | "Loading Wizard rewards…" and "Loading classes…" still visible at capture (not at 1280): the play-kit panels fetch after settle. The "Class challenges" panel is still navy. | Timing; the panel look is gap V10 (owner decision). |
| G13 | Info | `/student/reports` (student) | 375 | No status recorded: the first compile of the route took 52 s and the navigation timed out. 768 and 1280 captured. | Re-captured after the run (see below). |
| G15 | High | `/admin/import-data` (admin) | 375 | The CSV example table pushes the document 171 px wider than the viewport (`main` 187 px). | `import-data/page.tsx`: a horizontal `ScrollBar` inside the example `ScrollArea`. |
| G16 | Medium | `/admin/students`, `/admin/teachers/add`, `/admin/article-creation` (admin) | all | axe `button-name` (critical): 6 filter comboboxes, 2 icon buttons, 3 comboboxes with no accessible name; 16 px and 29-36 px controls on the article creation tabs. | Admin screens wait for the owner decision (Phase 4 note); listed as open items in the plan (Phase 1 note). |
| G17 | Low | `/admin/dashboard` (admin) | all | axe `color-contrast` on the green and red "from last week" captions (`text-green-600` 12 px); the activity cards and charts show fixed sample numbers (327, 187, 1,168, 73 %) under three "Data unavailable" cards. | Owner item: the admin dashboard data wiring is a separate track (page comment). |
| G18 | Low | `/admin/students/classrooms` (admin) | 375 | axe `scrollable-region-focusable`: the table container scrolls sideways but cannot take keyboard focus. | Admin screens; owner decision. |
| G19 | Info | `/admin` (admin) | 375 | No status recorded (the redirect to the dashboard timed out on the first compile); 768 and 1280 redirect to `/admin/dashboard`. | Re-captured after the run. |
| G20 | Low | `/teacher/class-roster/<id>/books/<id>/progress` (teacher, Lane D+E) | all | The 14 lesson cells per student are 40 × 36 px links (42 on the QA class). The grid scrolls inside its card; no overflow. | Lane D+E polish: `min-h-11` cells or a row-level link. Not a Lane C file. |
| G21 | Low | `/student/reports` (student) | 375, 768 | "XP Earned" and "XP Overall" show an empty chart frame with no empty state when the student has no XP rows; the heatmap month buttons are 28 px. | Phase 2 gave the reports page states for the lists; the chart frames keep the legacy component. Left for Lane G. |
| G14 | Info | `/student/history` (student) | 375 | The screenshot shows the shimmer grid: the list fetch had not returned at capture (the harness only waits for `animate-pulse`). 768 and 1280 show the list. | Timing; see the re-capture. |

Fixes G1-G5 are in Lane C commit (see the plan, Gates). Screens reviewed by eye at 375 and 768:
public home, sign-in, student home, read list, article, lesson, assignments, vocabulary,
sentences, games, history, reports, class book, teacher dashboard, my classes, class roster list,
class detail, class sheet, QR cards, lesson plan. No overlap, cut-off text, or broken layout at
768 other than G1.

## Keyboard walk-through (`gates/keyboard.json`)

Five walks: student home at 1280 and 375, teacher my classes, teacher class detail, student
lesson (all 1280). On every page the first Tab lands on "Skip to main content", Enter moves the
focus into `main#main-content`, every focused control shows a focus ring (one exception: the
roster search input, which changes its border colour only), no focused control sits off screen,
the account menu opens from its button and closes with Escape. At 375 the student account menu
listed no `menuitem` nodes after Enter (the phone menu is a sheet, not a menu); the trigger and
Escape still behave. The first keyboard run of the day landed on the sign-in page for the
student walks: the student session from 12:21 was gone by 13:00 (about 40 minutes), while the
teacher session lived on; the rerun with fresh sessions passed. Open question for Lane B: the
student session lifetime.

## Gate result

- Vision sweep at 375, 768, and 1280: 65 routes, 195 captures. Critical: none. High: G1, G2, G3,
  G15, all fixed in this track (G15 is an admin page; one class). Medium: G4, G5 fixed; G16
  stays open with the admin owner decision. The 768 width has evidence for every route now
  (FR-10).
- Keyboard: pass (see above).
- Visual baselines: see the plan entry.

## Confirmation on the production build (2026-10-05, after the fixes)

The fixed routes were captured again from `next build` + `next start` of the merged branch
(`measure/qa/browser-2026-10-05/gates/` holds the first run; the confirmation inventories are
in the session scratchpad). Results:

- G2, G3, G4, G5: the axe `button-name`, `color-contrast` (leaderboard), and
  `aria-prohibited-attr` violations are gone.
- G1: the first fix (the date-range button) was not the cause. The overflow at 768 came from
  the right column of the report panels: the CEFR gauge (a fixed 300 px SVG) and the heatmap
  calendar (276 px) did not fit a third of 768 px. Fix: the report panels use three columns
  from 1024 px (`lg:`), so at 768 the side column stacks full width. Both `/student/reports`
  and `/teacher/student-progress/<id>` measure 0 px overflow at every width now.
- G15: the example table was not the cause either. The upload card was 530 px wide at 375
  because the file input keeps its intrinsic width inside a flex row and the grid column had
  no `min-w-0`. Fix: `min-w-0` on the grid, the column, and the input. 0 px overflow now.
- Still open, all Low: the public home logo contrast (G6); the react-day-picker outside-month
  day numbers on the reports heatmap (`color-contrast`, 4 nodes, legacy component); the admin
  sidebar "Article Creation" label contrast at 1280. The student home showed a shimmer at the
  capture moment in one run (the leaderboard loads after the page); a direct check found no
  loading marker after settle.
