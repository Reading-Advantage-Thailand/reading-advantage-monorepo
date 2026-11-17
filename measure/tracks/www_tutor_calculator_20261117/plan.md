# Implementation Plan: www Tutor Advantage screens and commission calculator

> **Track ID:** `www_tutor_calculator_20261117` · **Spec:** [spec.md](./spec.md)
> **Source:** PM assignment A-63 (Daniel, Google Tasks `R2t2eF9Z`, 2026-11-17). Order: "update the tutor advantage www pages with new screenshots ... and include a commission calculator in the page with some networking as examples of income and commission structure."
> **Calculator shape:** Daniel, Tasks `ZTlPNmVq`, 2026-11-17 06:50 ICT: "input number of personal students, number of legs with students by leg, and which demonstrates in a graph how the payout works."
> **Page:** `/products/tutor-advantage` in en, th, and zh, `apps/www-reading-advantage`.
> **Due:** 2026-11-21. **Branch:** `feat/a63-tutor-calculator`.

## Rules for this plan

1. Markers: `[ ]` pending, `[~]` in progress, `[x]` done, `[b]` at a human gate.
2. Each task names its acceptance criterion in the form `Test: AC-n`, and each criterion has one
   command or one review that can fail.
3. Each task follows `measure/workflow.md`: the failing test first, then the code, then one
   commit with `(track_id: www_tutor_calculator_20261117)`. The commit header is 100 characters
   or less.
4. Pathspec commits only. No `git add -A`, no `git commit -a`, no stash, and no reset.
5. Tests read no file outside the repository. Tests compare no hash.
6. Every heavy command runs as
   `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
7. No deploy command and no Cloud Run change. The push to `origin/master` is www-only and
   standing-approved, and it comes after the PM page-check (spec D-13 and open question 5).
8. Every new string comes from spec sections 5.4, 6.3, 6.4, D-2a, and D-9. The drafts marked in
   the spec are marked `draft` in code comments and stay until PR answers.

## Phase 1: the commission calculator

Phase 1 needs nothing from the PM. It ends at a local checkpoint and ships no push.

- [x] 1.1 Red: pin the module with a failing test. Test: AC-1, AC-2, AC-3, AC-4.

  File `apps/www-reading-advantage/src/lib/tutor-commission.test.ts`. It holds:

  1. The six rates of spec section 3 to four decimals, `commissionRate(0)`,
     `commissionRate(-5)`, and a rate below 71.43% at 10^9.
  2. Preset 1 (4 own students, no legs): GV 12,000, rate 46%, gross 5,520.00, leg payouts 0,
     tax 165.60, net 5,354.40.
  3. Presets 2 and 3 of spec D-2 to the satang, each leg's volume and payout included.
  4. The conservation check in integer satang, not in baht Numbers: leg payouts plus payout
     equal the gross satang for presets 2 and 3, so 801,000 + 464,569 = 1,265,569 and
     1,201,500 + 669,444 = 1,870,944. A baht-Number sum fails here in float.
  5. The zero case: no students and no legs gives 0 everywhere, rate 0, and `zero`.
  6. `payoutAfterDeduction(0, 0)` and `(100, 150)` equal 0, and tax and net are 0 on a zero
     payout.
  7. `explainVariant` for the three states, including two legs with 0 students giving
     `ownOnly`.
  8. `resizeLegs`: add, keep, and drop entries, and a new leg gets 3 students.

  Done: 7eb6991fc85fbd0e833a193e35101ddd2b172915. Red command exit 1: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage exec vitest run src/lib/tutor-commission.test.ts --reporter=dot --silent=true'`. Evidence: `Test Files 1 failed (1)`, `Tests no tests`, cause `Failed to resolve import "@/lib/tutor-commission" from "src/lib/tutor-commission.test.ts"`. The module file does not exist.

- [x] 1.2 Green: write the module. Test: AC-1, AC-2, AC-3, AC-4.

  File `apps/www-reading-advantage/src/lib/tutor-commission.ts` with the API of spec section
  5.2. Satang truncation with BigInt (D-3), the one-level leg payout and the deduction (D-1,
  D-4), `NETWORK_PRESETS` with price 3,000 (D-2), and negative or non-finite input clamped to
  0. JSDoc on every export.

  Done: 377e45b8c87d13adf1f1b3365829581cb60964b1. The command of task 1.1 exits 0: the Red
  command `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run src/lib/tutor-commission.test.ts --reporter=dot
  --silent=true'` reports `Test Files 1 passed (1)` and `Tests 22 passed (22)` at exit 0.
  `pnpm turbo run check-types --filter=www-reading-advantage` exits 0.

- [x] 1.3 Red: pin the locale keys and the copy. Test: AC-5, AC-7, AC-8.

  File `apps/www-reading-advantage/src/__tests__/www-tutor-calculator.locale.test.ts`. It
  imports the three dictionaries from `@/locales/pages/products/tutor-advantage` and holds:
  every `calculator.*` value of spec 5.4 word for word in en and th, the same key paths in en,
  th, and zh, the zh values equal to the en values (D-10), the copy key order, the absence of
  `inputs.secondLevel`, `inputs.studentsSecondLevel`, and `explain.twoLevels`, the preset 3
  draft of D-2a, the absence of `5,884`, `5,707`, `22,714`, and `9,889`, the price default of
  3,000 in `inputs.priceNote`, and a scan that fails on each forbidden claim of D-16 inside the
  `calculator` block: `annual`, `per year`, `hour`, `hourly`, `VAT`, `Tawi`, `no earning cap`,
  `salary`, and `teacher`.

  Done: 08fcd93b039f53d26447a9ec8590c17264397ec3. Red command exit 1: `bash
  /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run src/__tests__/www-tutor-calculator.locale.test.ts
  --reporter=dot --silent=true'`. Evidence: `Test Files 1 failed (1)`, `Tests 10 failed | 8
  passed (18)`. The `calculator` block is absent, so `en.calculator` is `undefined`. The ten
  failing cases name the block, the en and th pins, the key order, the zh pins, the D-2a
  draft, the chart labels, and the two price notes. Four passing cases are vacuous at Red:
  key-path parity, zh leaf-map equality, the figure absence scan, and the D-16 absence scan.
  The four positive controls prove those checks fire on an injected value. Evidence files:
  `measure/runs/www_tutor_calculator_20261117/red-1.3-08fcd93b.json` and `.log`.
  Correction (2026-11-17): the preset pins now render bracket leaf keys through `leafKey()`; correction commit `704f03c497cac94d735684b839ae0538f3882465`.

- [x] 1.4 Green: add the `calculator` block to en, th, and zh. Test: AC-5, AC-7, AC-8.

  File `apps/www-reading-advantage/src/locales/pages/products/tutor-advantage.ts`, in all three
  dictionaries, after `tutorRole` and before `faq`. Values come from spec 5.4, D-2a, and D-9.
  The `presets[2]` values and the `chart` values carry a `draft` comment. One comment above the
  zh block records the placeholder rule of D-10.

  Done: 27f33b18e7198d498f6f2008740c38077cb1dfaf. The command of task 1.3 exits 0: the targeted
  command `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run src/__tests__/www-tutor-calculator.locale.test.ts
  --reporter=dot --silent=true'` reports `Test Files 1 passed (1)` and `Tests 18 passed (18)`
  at exit 0. `pnpm turbo run check-types --filter=www-reading-advantage` exits 0. Evidence
  files: `measure/runs/www_tutor_calculator_20261117/green-1.4-27f33b18e.json` and `.log`.

- [x] 1.5 Red: pin the calculator behaviour. Test: AC-9.

  File `apps/www-reading-advantage/src/components/marketing/tutor-commission-calculator.test.tsx`
  with `@testing-library/react` and `userEvent`. It holds: the default paint of 0 figures and
  the `zero` line; the leg count going 0, 1, 2, 3 with one student row per leg and a new leg at
  3; preset 1 giving `5,520` and `5,354.40`; preset 3 giving `18,709.44`, `12,015`, `6,694.44`,
  and `6,493.61` with three leg rows in the graph; the `aria-pressed` state on one preset only;
  the setup and result text of the selected preset; the clear on edit (D-7); the live region on
  the result card; the labelled inputs with `min="0"`; and the price default of 3,000 restored
  by a preset (D-5).

  Props come from the en dictionary, so the test reads the copy the page reads.

  Done: bcaf27d8003a8f83ceb3dac6e24f3a28f989eb12. Red command exit 1: `bash
  /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run
  src/components/marketing/tutor-commission-calculator.test.tsx --reporter=dot
  --silent=true'`. Evidence: `Test Files 1 failed (1)`, `Tests no tests`, cause
  `Failed to resolve import "./tutor-commission-calculator" from
  "src/components/marketing/tutor-commission-calculator.test.tsx". Does the file exist?`.
  The component file does not exist at this commit. The test holds 10 cases
  (test_files=1, authored_cases=10); none execute because the import fails at transform.
  Evidence files: `measure/runs/www_tutor_calculator_20261117/red-1.5-bcaf27d80.json` and
  `.log`.
  Correction (2026-11-17): the D-7 figure assertion now scopes to the results region and expects
  exactly two `15,000` matches (`results.ownGV` and `results.networkGV`, spec 5.3 item 6 and D-3),
  correction commit `e42aa53fa0f00571b32a46f4c80fc4fb20b81958`. The targeted command reports
  `Tests 10 passed (10)`. The two uncommitted Green files were left untouched.

- [x] 1.6 Green: build the client component. Test: AC-9.

  File `apps/www-reading-advantage/src/components/marketing/tutor-commission-calculator.tsx`
  with `"use client"` and the props of spec 5.3. Layout from the June file: preset row, input
  cards with one row per leg, the payout graph (D-9), the rate curve (D-11), the result panel,
  the breakdown rows, the explain line, the notes, and the disclaimer. Add the one rule for the
  bar width to `src/app/[locale]/globals.css`. Theme colors only, no arbitrary value, no inline
  style except the bar width custom property, 44 px targets, and no horizontal scroll at
  390 px.

  Done: 3786a1d299929a5bb5f4912ccbffcb120bf0c66d.

  Note: spec 5.3 item 6 lists a net row; the hero already carries the net figure, so the row
  list ends at withholding tax and the hero is the net.

- [x] 1.7 Wire the section and pin the order. Test: AC-10.

  Files `page.tsx` and `page.test.tsx`. The page reads `calculator.*` with `getScopedI18n` and
  renders the component in a `section` with `data-testid="tutor-calculator"` and an
  `id="commission-calculator"` anchor, after the `tutorRole` section and before `commitments`.
  The test asserts the DOM order and the presence of the section.

  Done: f18b6dbbd6e0af3e2d9bdb8e1f96b39d6267947b.

  Red: the targeted page test with the new assertions exits 1. Evidence: `Test Files 1 failed
  (1)`, `Tests 2 failed | 4 passed (6)`; both new cases see a null `tutor-calculator` section.

  Green: the targeted command `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh
  -c 'pnpm --filter www-reading-advantage exec vitest run
  "src/app/[locale]/(marketing)/products/tutor-advantage/page.test.tsx" --reporter=dot
  --silent=true'` exits 0 with `Test Files 1 passed (1)` and `Tests 6 passed (6)`. Note: the
  `[[]locale[]]` escaping form in the brief finds no test files and exits 0 through
  `passWithNoTests`; the literal quoted path is the form above. Types:
  `pnpm turbo run check-types --filter=www-reading-advantage` exits 0. Lint:
  `pnpm --filter www-reading-advantage lint` exits 0 with no `shadcn/*` error. `bash
  measure/doctor.sh` exits 1 at its architecture step on a pre-existing analyzer snapshot hash
  mismatch; that step covers `packages/architecture-enforcement`, which this task does not touch.

- [x] 1.8 Run the Phase 1 gates and check the page by hand. Test: AC-11, AC-12.

  - www suite: `pnpm --filter www-reading-advantage test --reporter=dot --silent=true`.
  - Types: `pnpm turbo run check-types --filter=www-reading-advantage`.
  - Lint: `pnpm --filter www-reading-advantage lint`, with no `shadcn/*` error in a touched file.
  - Ratchet: `git diff --exit-code scripts/ci/shadcn-ratchet-baseline.json`.
  - Build through the runner: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage build'`.
  - Dev server by hand: 390, 980, and 1280 px, each preset, the leg count from 0 to 4, one hand
    edit, and the keyboard path through the inputs. Record the captures under the track folder.

  Done: 2026-11-17, on HEAD `4c4153b04`. The five gates exit 0:

  1. `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
     www-reading-advantage test --reporter=dot --silent=true'` exit 0: `Test Files 65 passed
     (65)`, `Tests 2533 passed (2533)`.
  2. `pnpm turbo run check-types --filter=www-reading-advantage` exit 0. The first run replays a
     cache hit on unchanged inputs; a `--force` rerun exits 0.
  3. `pnpm --filter www-reading-advantage lint` exit 0 with no output, so no `shadcn/*` error in a
     touched file.
  4. `git diff --exit-code scripts/ci/shadcn-ratchet-baseline.json` exit 0.
  5. `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
     www-reading-advantage build'` exit 0. The first attempt exits 1 on the Next.js
     security-advisory nudge after the route table prints; the same command retried exits 0.

  Captures: `measure/runs/www_tutor_calculator_20261117/p1-captures/` holds 66 PNGs and
  `p1-checks.json`. The run uses the built app on port 3107 (`pnpm --filter
  www-reading-advantage start`), `/en/` and `/th/products/tutor-advantage`, and 390, 980, and
  1280 px.

  Checks, each verified at both locales and the three widths:
  - no horizontal scroll at 390 px in every state;
  - the order `#become-a-tutor` then `tutor-calculator` then `tutor-commitments`;
  - `gross - downline - tax = net` on every preset and leg state, for example preset 3
    `18,709.44 - 12,015 - 200.83 = 6,493.61`;
  - the graph rows add up to the gross, for example preset 3 `4,005 + 4,005 + 4,005 + 6,694.44 =
    18,709.44`;
  - the graph leg rows equal the leg count from 0 to 4;
  - exactly one preset is pressed after a click, and none after an edit;
  - a typed price of 5,000 returns to 3,000 when a preset is picked;
  - a new leg starts at 3 students;
  - Thai text renders in the calculator at 390, 980, and 1280 px;
  - the Tab path reaches the three presets and all five inputs at two legs.

  `bash measure/doctor.sh` was not run as a gate here: a pre-existing architecture snapshot hash
  mismatch fails it, and no file in this track touches that check.

  Red remediation (2026-11-17): Review A at audited head `10dcf42a8d88c90f8e02debae761196ef40f2ccd` (artifact `review-a-p1-10dcf42a8.json`) returned CHANGES_REQUIRED. F1 added four AC-9 component cases: leg removal from 3 to 2, four legs at count 4, preset index 1 figures and text and pressed state, and preset index 2 text. F2 added five clamp pins: NaN and Infinity rates, Infinity network money, NaN price, NaN leg, and negative price and student count. `phase_base_sha` 8862cf14cc6e9b11e62d08d5084288a4c294752c; `role_base_sha` 4e32f7c76710f0647aa712b74d55dc8618bc8076. Command `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage exec vitest run src/components/marketing/tutor-commission-calculator.test.tsx src/lib/tutor-commission.test.ts --reporter=dot --silent=true'` exits 0: `Test Files 2 passed (2)`, `Tests 41 passed (41)`. Build-graph scan skipped under PM load watch: scope graph work to the app or skip. Result artifacts: `measure/runs/www_tutor_calculator_20261117/red-remediation-1-*.json` and `.log`.

  Adversarial remediation (2026-11-17): the adversarial suite at `61e614489` left one Red test,
  `src/lib/tutor-commission.adversarial.test.ts > A6 finite input whose product overflows`, which
  threw `RangeError: The number Infinity cannot be converted to a BigInt` in `toSatang` for a
  finite price whose volume product overflows. Fix at `daa77805d` in `src/lib/tutor-commission.ts`:
  `calculateNetwork` clamps `ownVolume`, each leg volume, and `networkVolume` to finite
  non-negative, and `toSatang` returns `0n` when the satang product is not finite; the stale
  `preTax` JSDoc now states the graph renders it as the tutor's payout row (spec D-9 item 2).
  Normal inputs are bit-identical. `role_base_sha` 418b4e7cb4f3f46260a80b67e4699739210d9922.
  Gate `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run src/lib/tutor-commission.test.ts
  src/lib/tutor-commission.adversarial.test.ts src/components/marketing/tutor-commission-calculator.test.tsx
  src/components/marketing/tutor-commission-calculator.adversarial.test.tsx --reporter=dot
  --silent=true'` exits 0: `Test Files 4 passed (4)`, `Tests 79 passed (79)` (module 27, module
  adversarial 23, component 14, component adversarial 15). `pnpm turbo run check-types
  --filter=www-reading-advantage` exits 0. Build-graph updated incrementally, one file, no
  whole-repo scan (PM load watch). Result artifacts:
  `measure/runs/www_tutor_calculator_20261117/green-p1-fix-daa77805d.json` and `.log`.

- [x] 1.9 Checkpoint Phase 1. Test: AC-11.

  Commit the plan update with the task SHAs and the gate output. Phase 1 ships no push (D-13).

  Checkpoint: 2026-11-17. `phase_base_sha` 8862cf14cc6e9b11e62d08d5084288a4c294752c; code head
  10dcf42a8d88c90f8e02debae761196ef40f2ccd. Task SHAs, 1.1 to 1.8: 7eb6991fc, 21e23c2f2,
  377e45b8c, 545a43a79, 08fcd93b0, 704f03c49, fb453f519, 27f33b18e, 1142ecff9, bcaf27d80,
  e42aa53fa, 3786a1d29, a8b78cf90, f18b6dbbd, 4c4153b04, 10dcf42a8. The five gates of task 1.8:
  suite exit 0 with `Test Files 65 passed (65)` and `Tests 2533 passed (2533)`; types exit 0; lint
  exit 0; ratchet exit 0; build exit 0 on retry. Captures:
  `measure/runs/www_tutor_calculator_20261117/p1-captures/`. Phase 1 ships no push (D-13).

Phase 1 acceptance: PASS at d279b870341c067c33fc884ae8863b5428487c17; artifact measure/runs/www_tutor_calculator_20261117/phase-accept-p1-d279b8703.json.

## Phase 2: the screens gallery and the live copy

- [x] 2.0 The set arrived. Test: 41 files in `student-mobile/`, 31 in `tutor-desktop/`, and a
  README at version 2.0.

  Path `~/Desktop/handoff/a63-tutor-www-calculator/screens/`, version 2.0, 2026-11-17, source
  commit `50675d41` of `advantage-pr`. 41 files in `student-mobile/` at 520 x 1125, 31 files in
  `tutor-desktop/` at 1440 x 900, and `README.md` with the use rules of spec 6.1. Recorded at
  authoring time.

- [x] 2.1 Make the blurred copies, add the three assets, and add the manifest entries.
  Test: AC-13, AC-14.

  Files: `apps/www-reading-advantage/scripts/blur-tutor-screens.py`, the three webp files under
  `apps/www-reading-advantage/public/images/products/tutor-advantage/`,
  `src/lib/product-pictures.ts`, and `src/lib/__tests__/tutor-screens.test.ts`.

  The script takes the source folder and the output folder as arguments and holds one rectangle
  list per used file for every visible "Reading 3.1". It blurs those rectangles, writes the webp
  at the delivered size, and prints each output path. The rectangles are found by opening each
  file at 100%. The used files are `student-mobile/070`, `student-mobile/002`, and
  `tutor-desktop/062`; `062` holds the class name in the header, the subtitle, the lesson
  dropdown, and the progress card.

  Build only the used screens. The other 69 files stay out of the repository. Keep the set's
  folder names and file names (D-14). The script is a build tool, not a test, so it may read the
  handoff folder; nothing in the test suite does.

  Then add `tutorScreens` to `productPictures` in slot order with the real pixel size and
  `portrait: false`.

  Then the review of D-14: one line per file against the six use rules, and one full-size look
  at each saved copy to confirm that no "Reading 3.1" shows.

  Done: 320fc2fa176b2c2e40eab09c2d208ede98945370. Three files exist under `public/`. The new
  test `src/lib/__tests__/tutor-screens.test.ts` asserts the three `tutorScreens` keys in slot
  order, each entry's `src`, `width`, `height`, and `portrait: false`, that `src` starts with
  `/images/products/tutor-advantage/`, and that each file exists under `public/` through
  `node:fs`.

  Red run: exit 1, `Test Files 1 failed (1)`, `Tests 7 failed (7)`, because the module held no
  `tutorScreens` export. Green run: exit 0, `Test Files 1 passed (1)`, `Tests 7 passed (7)`.
  The products-page picture test still passes: exit 0, `Tests 19 passed (19)`.
  `pnpm turbo run check-types --filter=www-reading-advantage` exits 0. `pnpm --filter
  www-reading-advantage lint` exits 0.

  Deviation (spec 6.2): spec says "into `productPictures`". That object is `as const satisfies
  Record<string, ProductPictureFile>`, and `src/__tests__/products-page-pictures.red.test.tsx`
  runs `statSync` on every value. A nested object breaks both, so `tutorScreens` is a sibling
  export in the same file, in slot order.

  Deviation (blur boxes): four delivered edges were widened after a full-size measurement of
  the glyph bounds. Hero `x1` 269 to 303 ("3.1" ends at 301). Bubble `y1` 227 to 234 ("g"
  descender ends at 232). Title `x1` 547 to 553 ("1" ends at 550). Dropdown `x0` 391 to 395
  (the "1:" colon ends at 392 and stays). The delivered boxes left glyph pixels outside the
  blur.

  Blur check by measurement, grey mean and standard deviation of each box, source to output:

  | File | Box | Source mean | Source sd | Output mean | Output sd |
  |---|---|---|---|---|---|
  | `student-mobile/070` | (34,121,182,152) | 220.97 | 66.96 | 226.43 | 7.01 |
  | `student-mobile/070` | (110,198,233,234) | 224.94 | 68.36 | 229.82 | 10.47 |
  | `student-mobile/070` | (137,351,303,388) | 208.65 | 83.77 | 215.22 | 9.35 |
  | `student-mobile/070` | (118,923,247,953) | 213.59 | 78.43 | 220.60 | 7.80 |
  | `tutor-desktop/062` | (395,95,553,134) | 213.74 | 79.66 | 219.52 | 9.66 |
  | `tutor-desktop/062` | (393,132,485,157) | 235.19 | 45.59 | 233.49 | 4.71 |
  | `tutor-desktop/062` | (395,390,487,419) | 230.63 | 59.08 | 235.29 | 5.13 |
  | `tutor-desktop/062` | (1085,341,1173,364) | 235.47 | 43.96 | 240.55 | 4.59 |

  `student-mobile/002` holds no box; it shows no class name.

  Full-size review of D-14 and AC-14, one line per saved file:

  - `student-mobile/070-screen.webp`: student home with the Saturday class. No admin screen, no
    price, no error state, no student face. The chip, the bubble, the hero title, and the class
    row show no class name.
  - `student-mobile/002-screen.webp`: lesson phase 8 of 18 with a typed answer. No class name,
    no admin screen, no price, no error state, no face.
  - `tutor-desktop/062-screen.webp`: tutor class list and lesson dropdown. No admin screen, no
    price, no error state, no student face. The header, the subtitle, the dropdown, and the
    progress card show no class name.

- [x] 2.2 Add the gallery section and its copy. Test: AC-10, AC-13.

  Add the `screens` block to en, th, and zh (spec 6.3, after `tutorRole` and before
  `calculator`). Render the section in `page.tsx` with `SectionHeader`, three `ProductPicture`
  cards with the slot `alt`, and the caption under each card, inside
  `data-testid="tutor-screens"` and before `tutor-calculator`. Grid: one column at 390 px, two
  half-width cards and one full-width card at `md`.

  The page test asserts three cards, the caption and alt of each slot, and the order
  `tutorRole` then `tutor-screens` then `tutor-calculator` then `commitments`.

  Done: e583e21b31b6a73c2d1e8ba1aa65ddc0053bd3d7. `phase_base_sha`
  d279b870341c067c33fc884ae8863b5428487c17; `role_base_sha`
  29ffa35423fc8131cc099d5b0462ebc286e13ae7.

  Red: exit 1. Command:
  `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run "src/app/[locale]/(marketing)/products/tutor-advantage/page.test.tsx"
  src/__tests__/www-tutor-calculator.locale.test.ts --reporter=dot --silent=true'`. Evidence:
  `Test Files 2 failed (2)`, `Tests 8 failed | 26 passed (34)`. The `screens` block is absent, so
  `en.screens` is `undefined` and the leaf count is 0. The `tutor-screens` section is absent, so
  both page cases see a null node.

  Green: exit 0. The same command reports `Test Files 2 passed (2)` and `Tests 34 passed (34)`
  (page 8, locale 26). `pnpm turbo run check-types --filter=www-reading-advantage` exits 0.
  `pnpm --filter www-reading-advantage lint` exits 0 with no output, so no `shadcn/*` error is in
  a touched file. `git diff --exit-code scripts/ci/shadcn-ratchet-baseline.json` exits 0.
  Evidence files: `measure/runs/www_tutor_calculator_20261117/green-2.2-e583e21b3.json` and
  `.log`.

  Deviation (leaf count): the role brief says "the 12 new leaf strings". Spec 6.3 and this task
  hold nine: eyebrow, heading, description, and caption plus alt for each of three items. The
  test pins nine and asserts the count, so an invented string fails.

  Deviation (page test copy): `src/test/setup.ts` mocks `getScopedI18n` to return
  `<scope>.<key>`. The page test therefore asserts the per-slot key path of each card's `alt`
  and caption. The locale test pins the literal en and th strings. No existing case was
  weakened.

  Note (build-graph): skipped under the PM load watch. No export, signature, or import edge
  changed.

- [x] 2.3 Change the two live lines. Test: AC-6.

  `tutorRole.points[3]` and `faq.items[5].answer` in en and th take the strings of spec 6.4. The
  zh values take the new English lines (D-10). Add both lines to the locale test, and add the
  two old lines to its absent list.

  Done: 0a7ff97e596643212b52c3b9bf8fb7703e0628b2. `phase_base_sha`
  d279b870341c067c33fc884ae8863b5428487c17; `role_base_sha`
  9314f07decb27045ddce7d4f87d105d458b9b290.

  Red: exit 1. Command:
  `pnpm --filter www-reading-advantage exec vitest run
  src/__tests__/www-tutor-calculator.locale.test.ts --reporter=dot --silent=true`. Evidence:
  `Test Files 1 failed (1)`, `Tests 4 failed | 27 passed (31)`. Both paths still held the old
  copy, so the en pins, the th pins, and the zh pins failed, and the absent scan reported both
  old lines at `tutorRole.points[3]` and `faq.items[5].answer`.

  Green: exit 0. Command:
  `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run src/__tests__/www-tutor-calculator.locale.test.ts
  --reporter=dot --silent=true'`. Evidence: `Test Files 1 passed (1)`, `Tests 31 passed (31)`.

  `grep -n "We do not publish income figures"
  apps/www-reading-advantage/src/locales/pages/products/tutor-advantage.ts` prints no line and
  exits 1. `pnpm turbo run check-types --filter=www-reading-advantage` exits 0. Evidence files:
  `measure/runs/www_tutor_calculator_20261117/green-2.3-0a7ff97e5.json` and `.log`.

  Note (build-graph): skipped under the PM load watch. No export, signature, or import edge
  changed.

- [x] 2.4 Run the Phase 2 gates. Test: AC-11, AC-12, AC-16.

  The five gates of task 1.8 again, then
  `node scripts/ci/affected-apps.mjs --base ff028a710 --head <HEAD>`, which prints
  `["www-reading-advantage"]`.

  Done: 2026-11-17, on HEAD `9befd67c3`. `phase_base_sha`
  d279b870341c067c33fc884ae8863b5428487c17; `role_base_sha`
  9befd67c3ab8df69dbed087b24a882f6189b444c. Every required gate reaches exit 0: the five
  exit codes are 0, 0, 0, 0, and 0, and the build reaches 0 on its second attempt.

  1. `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
     www-reading-advantage test --reporter=dot --silent=true'` exit 0: `Test Files 68 passed
     (68)`, `Tests 2602 passed (2602)`.
  2. `pnpm turbo run check-types --filter=www-reading-advantage` exit 0. The first run replays a
     cache hit on unchanged inputs; a `--force` rerun exits 0 with `cache bypass, force
     executing`.
  3. `pnpm --filter www-reading-advantage lint` exit 0 with no output, so no `shadcn/*` error is
     in a file this track touched, and none anywhere in the app.
  4. `git diff --exit-code scripts/ci/shadcn-ratchet-baseline.json` exit 0. The baseline keeps
     `lintWarnings: 241` and `copies: 36`.
  5. `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
     www-reading-advantage build'` exits 1 on the first attempt at the Next.js
     security-advisory nudge, after the route table prints. The same command retried exits 0
     with the nudge as a warning.
  6. `node scripts/ci/affected-apps.mjs --base ff028a7105ccd5de0c3e9534dd8536b7667e22de --head
     9befd67c3ab8df69dbed087b24a882f6189b444c` exit 0, output `["www-reading-advantage"]`.
     Deviation: the script accepts only a 40-hex id, so the short base `ff028a710` exits 2 with
     `affected-apps: --base must be a 40-character lowercase hex commit id`. The resolved id of
     the same commit is the base above, and that run prints the expected app.

  `bash measure/doctor.sh` was not run: a pre-existing architecture snapshot hash mismatch fails
  it, and no file in this track touches that check. Evidence files:
  `measure/runs/www_tutor_calculator_20261117/green-2.4-9befd67c3.json` and `.log`.

- [x] 2.7 Red: replace the spec drafts with PR's final copy (handoff v0.4 section 8). Test: AC-5, AC-13.

  Update the pins that hold a superseded string, key, or figure: the three `chart.*` labels and preset 3 (8.1), gallery slot 2's `shortAnswer` key, caption, and alt (8.2), the `studentHome` caption and alt (8.4), and every preset-3 figure recomputed from `calculateNetwork` with `{ price: 3000, personalStudents: 2, studentsPerLeg: [4, 4, 4] }`. The gallery stays at three cards because 8.3 drops the `network` and `earnings` captions.

  Note: PR's answers of handoff v0.4 (advantage-pr commit c97ec996, section 8) supersede spec D-2a, D-9's draft labels and D-15a; the gallery stays at three cards because section 8.3 drops the two captions.

  Red evidence: exit 1. Command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage exec vitest run src/lib/tutor-commission.test.ts src/lib/tutor-commission.adversarial.test.ts src/components/marketing/tutor-commission-calculator.test.tsx src/components/marketing/tutor-commission-calculator.adversarial.test.tsx src/__tests__/www-tutor-calculator.locale.test.ts src/__tests__/www-tutor-screens-copy.adversarial.test.ts src/lib/__tests__/tutor-screens.test.ts src/lib/__tests__/tutor-screens.adversarial.test.ts "src/app/[locale]/(marketing)/products/tutor-advantage/page.test.tsx" "src/app/[locale]/(marketing)/products/tutor-advantage/page.adversarial.test.tsx" --reporter=dot --silent=true'`. Summary: `Test Files 6 failed | 4 passed (10)`, `Tests 25 failed | 115 passed (140)`. The 25 failing cases are nine locale copy and key failures, two module preset-3 failures, six component and component-adversarial failures, and eight manifest key failures. Every failure reads a replaced key, copy line, figure, or preset input. No failure has an unrelated cause.

  Recompute: `calculateNetwork({ price: 3000, personalStudents: 2, studentsPerLeg: [4, 4, 4] })` gives own volume 6,000, network volume 42,000, rate 59.1273%, gross 24,833.45, three legs of 12,000 at 5,520 each, leg total 16,560, payout before tax 8,273.45, tax 248.20, net 8,025.25. Display strings: `42,000`, `59.1%`, `24,833.45`, `16,560`, `8,273.45`, `248.20`, `8,025.25`. Chart key map by role: `chart.leg` to `chart.legPayout` for the leg row label, `chart.volume` to `chart.legVolume` for the leg row volume, `chart.you` to `chart.yourPayout` for the tutor payout row. Evidence: `measure/runs/www_tutor_calculator_20261117/red-2.7-d91e6c527.json` and `.log`.

  Correction (2026-11-17): the preset 3 net pin now reads the hero figure under the net label through a `heroValue()` helper. The net is the hero of the result card, not a breakdown `dd` row (task 1.6), and the committed adversarial pin fixes the breakdown at six `dd` values. The meaning holds: the figure 8,025.25 is visible on the result card. Correction commit `07a22294e46824e0a3be4ebdacfde1a4405c2ff4`. Command `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage exec vitest run src/components/marketing/tutor-commission-calculator.test.tsx src/components/marketing/tutor-commission-calculator.adversarial.test.tsx --reporter=dot --silent=true'` exits 0 with the five uncommitted Green files present: `Test Files 2 passed (2)`, `Tests 29 passed (29)`. The five uncommitted product files are untouched. `phase_base_sha` d279b870341c067c33fc884ae8863b5428487c17; `role_base_sha` 6c2d67161f9f86ee371901a3abf0648fb37341c6.

  Done: 7d94576c9018ddcd1c394837d40dad0f61076830. Ten-file targeted gate exits 0: `Test Files 10 passed (10)`, `Tests 140 passed (140)`. `pnpm turbo run check-types --filter=www-reading-advantage` exits 0; `pnpm --filter www-reading-advantage lint` exits 0 with no `shadcn/*` error in a touched file. The implementation commit holds the four named product files plus `page.tsx`, which needs `calculator.chart.*` and `tutorScreens.shortAnswer` so check-types and the page render pass after the manifest rename. Result artifacts: `measure/runs/www_tutor_calculator_20261117/green-2.7-7d94576c9.json` and `.log`.

- [x] 2.8 Run the Phase 2 gates again at the copy-changed head. Test: AC-11, AC-12, AC-16.

  `phase_base_sha` d279b870341c067c33fc884ae8863b5428487c17; `role_base_sha`
  203bd5e78dceb9c1701ac708886915f340005d5e. HEAD 203bd5e78 is clean, and the committed
  Phase 2 Red change sits inside `d279b8703..203bd5e78`.

  The six exit codes are 0, 0, 0, 0, 1 then 0, and 2 then 0. Every accepted run exits 0.

  1. `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
     www-reading-advantage test --reporter=dot --silent=true'` exit 0: `Test Files 71 passed
     (71)`, `Tests 2617 passed (2617)`.
  2. `pnpm turbo run check-types --filter=www-reading-advantage` exit 0 on a cache hit. The
     `--force` rerun exits 0 with `cache bypass, force executing`.
  3. `pnpm --filter www-reading-advantage lint` exit 0 with no output, so no `shadcn/*` error
     is in a file this track touched, and none anywhere in the app.
  4. `git diff --exit-code scripts/ci/shadcn-ratchet-baseline.json` exit 0, so the baseline
     file is byte-unchanged.
  5. `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
     www-reading-advantage build'` exits 1 on the first attempt at the Next.js
     security-advisory nudge, after the route table prints. The retry exits 0 with the nudge
     as a warning.
  6. `node scripts/ci/affected-apps.mjs --base
     ff028a7105ccd5de0c3e9534dd8536b7667e22de --head 203bd5e78` exits 2:
     `affected-apps: --head must be a 40-character lowercase hex commit id`. The resolved full
     head exits 0 and prints `["www-reading-advantage"]`.

  The ten-file targeted gate of task 2.7 exits 0 at this head: `Test Files 10 passed (10)`,
  `Tests 140 passed (140)`.

  Build proof: `.next/BUILD_ID` is `79VUEHlWBdmk6t_tXaU-p` at `2026-11-17 14:32:31 +0700`,
  against `date` `14:33:06`. The prior id was `O_4OqTZ0s7DFdhzVYcCKk` at 11:38 today, so the
  build is new. The build holds `Leg commission` and `A small team with three legs` in the
  tutor-advantage locale chunk. It holds no `Leg share` and no `22,714`.

  Evidence files: `measure/runs/www_tutor_calculator_20261117/green-2.8-203bd5e78.json` and
  `.log`.

  Note (build-graph): skipped under the PM load watch. No product file changed.

- [x] 2.9 Fix the rate-curve card labels that PM page-check F-1 names. Test: AC-15.

  On the rate-curve card, show `graph.rateTitle` as a visible `h3`, and show
  `graph.ratePoint` with the live rate beside it, as "This month · 59.1%". The SVG stays
  `aria-hidden` (D-11). Add `graph: { rateTitle, ratePoint }` to en, th, and zh in the
  `calculator` block. zh equals en at both paths (D-10), and the placeholder comment stays.
  Add one component case with preset 3. Add the two new leaves to the locale test's key
  order, pins, parity, and zh-equals-en coverage.

  Answers PM page-check finding F-1 of `a63-20261117-1500`
  (`~/Desktop/handoff/page-check/a63-20261117-1500/report.md`).

  Done: 6c0cf5de65ea092a28bf1246dff8a6fb57df7ce4. Red: exit 1, `Test Files 1 failed | 2
  passed (3)`, `Tests 1 failed | 60 passed (61)`, name `TutorCommissionCalculator rate curve
  card > shows the rate title, the month point with the rate, and keeps the curve
  aria-hidden`, cause `Cannot read properties of undefined (reading 'rateTitle')` because the
  `graph` block was absent. Green: exit 0, `Test Files 3 passed (3)`, `Tests 61 passed (61)`.
  `pnpm turbo run check-types --filter=www-reading-advantage` exits 0. `pnpm --filter
  www-reading-advantage lint` exits 0 with no output. Evidence files:
  `measure/runs/www_tutor_calculator_20261117/green-2.9-6c0cf5de6.json` and `.log`.

  Note (page wiring): `page.tsx` builds `calculatorCopy` key by key, so the two `graph`
  strings need a pass-through there. The file list of the fix brief did not name it.

  Gate confirmation at 9a53398301ae2fbd41e7e95de8e36ce18d50b9b5 (role base, clean worktree, no
  product change):

  1. `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
     www-reading-advantage test --reporter=dot --silent=true'` exits 0 with `Test Files 71
     passed (71)` and `Tests 2618 passed (2618)`, duration 60.81 s.
  2. `pnpm turbo run check-types --filter=www-reading-advantage` exits 0 on a cache hit
     (`f8d9bd0a3c285a8b`). The `--force` rerun exits 0 with `tsc --noEmit` in 4.015 s.
  3. `pnpm --filter www-reading-advantage lint` exits 0 with no output after `$ eslint .`.
  4. `git diff --exit-code scripts/ci/shadcn-ratchet-baseline.json` exits 0.
  5. `node scripts/ci/affected-apps.mjs --base
     ff028a7105ccd5de0c3e9534dd8536b7667e22de --head 9a5339830` exits 2:
     `affected-apps: --head must be a 40-character lowercase hex commit id`, which is the rule
     of test-strategy section 5.2. The resolved head exits 0 and prints
     `["www-reading-advantage"]`.

  The Red change of this task is inside `d279b8703..HEAD` (commit 6c0cf5de6). No Red test
  changed in this run.

  Evidence files: `measure/runs/www_tutor_calculator_20261117/green-2.9-gates-9a5339830.json`
  and `.log`.

  Note (build): the orchestrator rebuilt at this head. The first attempt exited 1 on the known
  Next.js security-advisory nudge; the retry exited 0. This session did not rebuild and did not
  touch the server on port 3120.

- [b] 2.5 PM page-check at 390, 980, and 1280 px. Test: AC-15.

  The PM captures `/en/`, `/th/`, and `/zh/products/tutor-advantage`. The check covers: both
  new sections in order, no horizontal scroll, the calculator figures readable, the graph rows
  adding up, the three screens sharp and free of a visible class name, the Thai read by Daniel,
  and the zh placeholder accepted. The report goes to the PM folder
  `~/Desktop/handoff/page-check/<stamp>/`.

  Gate owner: the PM, with Daniel on the Thai.

- [ ] 2.6 Push www-only and check the live pages. Test: AC-16.

  Confirm `origin/master` did not move, rebase when it did, then push. One commit range, www
  only, no deploy command from this session. Record the CD run and the HTTP status of the three
  URLs. If Daniel holds the release, the push waits for his word.

  Done: the three URLs answer 200 and show the two sections; the selector prints
  `["www-reading-advantage"]`; the Thai page shows the new Thai lines.

## Answers owed to PR

1. Preset 3 (name, setup, result) and the three `chart.*` labels are drafts (spec D-2a, D-9).
2. The `network` and `earnings` captions have no screen in the delivered set. Deliver a
   capture of the tutor app's network page and income page, or withdraw the two captions.
3. The `studentHome` caption names "Reedy practice". No allowed screen in the set shows it.
   Drop the clause or deliver a screen.
4. The `lessonPhases` alt names the tutor app, and the mapped screen is the student app
   (spec D-15a). Correct the alt or confirm it.

## Closeout

- [ ] C.1 Move the track to `measure/archive/www_tutor_calculator_20261117`, update the
  registry row, and record the closeout. Test: the closeout checker passes.

  The closeout runs after task 2.5 and before the report to the PM. The registry row names the
  commit range, the gate output, the page-check folder, and the open questions that stay with
  the PM.

## Out of scope

- The June claims of spec D-16.
- A second level, a two-level preset, and the `explain.twoLevels` line (D-4).
- An invented screen, and a caption without a picture (D-15).
- Any push before task 2.5, and any deploy command.
- A zh translation written in this session.
- A change to another page, another locale file, or the screenshot set of 2026-10-15.
