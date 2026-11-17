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

- [ ] 1.6 Green: build the client component. Test: AC-9.

  File `apps/www-reading-advantage/src/components/marketing/tutor-commission-calculator.tsx`
  with `"use client"` and the props of spec 5.3. Layout from the June file: preset row, input
  cards with one row per leg, the payout graph (D-9), the rate curve (D-11), the result panel,
  the breakdown rows, the explain line, the notes, and the disclaimer. Add the one rule for the
  bar width to `src/app/[locale]/globals.css`. Theme colors only, no arbitrary value, no inline
  style except the bar width custom property, 44 px targets, and no horizontal scroll at
  390 px.

  Done: the command of task 1.5 exits 0.

- [ ] 1.7 Wire the section and pin the order. Test: AC-10.

  Files `page.tsx` and `page.test.tsx`. The page reads `calculator.*` with `getScopedI18n` and
  renders the component in a `section` with `data-testid="tutor-calculator"` and an
  `id="commission-calculator"` anchor, after the `tutorRole` section and before `commitments`.
  The test asserts the DOM order and the presence of the section.

  Done: `pnpm --filter www-reading-advantage exec vitest run "src/app/\[locale\]/(marketing)/products/tutor-advantage/page.test.tsx" --silent=true`
  exits 0.

- [ ] 1.8 Run the Phase 1 gates and check the page by hand. Test: AC-11, AC-12.

  - www suite: `pnpm --filter www-reading-advantage test --reporter=dot --silent=true`.
  - Types: `pnpm turbo run check-types --filter=www-reading-advantage`.
  - Lint: `pnpm --filter www-reading-advantage lint`, with no `shadcn/*` error in a touched file.
  - Ratchet: `git diff --exit-code scripts/ci/shadcn-ratchet-baseline.json`.
  - Build through the runner: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage build'`.
  - Dev server by hand: 390, 980, and 1280 px, each preset, the leg count from 0 to 4, one hand
    edit, and the keyboard path through the inputs. Record the captures under the track folder.

  Done: every command exits 0 and the captures show the result rows adding up
  (`gross - downline - tax = net`) and the graph rows adding up to the gross.

- [ ] 1.9 Checkpoint Phase 1. Test: AC-11.

  Commit the plan update with the task SHAs and the gate output. Phase 1 ships no push (D-13).

## Phase 2: the screens gallery and the live copy

- [x] 2.0 The set arrived. Test: 41 files in `student-mobile/`, 31 in `tutor-desktop/`, and a
  README at version 2.0.

  Path `~/Desktop/handoff/a63-tutor-www-calculator/screens/`, version 2.0, 2026-11-17, source
  commit `50675d41` of `advantage-pr`. 41 files in `student-mobile/` at 520 x 1125, 31 files in
  `tutor-desktop/` at 1440 x 900, and `README.md` with the use rules of spec 6.1. Recorded at
  authoring time.

- [ ] 2.1 Make the blurred copies, add the three assets, and add the manifest entries.
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

  Done: three files exist under `public/`. The new test
  `src/lib/__tests__/tutor-screens.test.ts` asserts the three `tutorScreens` keys in slot order,
  each entry's `src`, `width`, `height`, and `portrait: false`, that `src` starts with
  `/images/products/tutor-advantage/`, and that each file exists under `public/` through
  `node:fs`. The full-size review lines go into this plan.

- [ ] 2.2 Add the gallery section and its copy. Test: AC-10, AC-13.

  Add the `screens` block to en, th, and zh (spec 6.3, after `tutorRole` and before
  `calculator`). Render the section in `page.tsx` with `SectionHeader`, three `ProductPicture`
  cards with the slot `alt`, and the caption under each card, inside
  `data-testid="tutor-screens"` and before `tutor-calculator`. Grid: one column at 390 px, two
  half-width cards and one full-width card at `md`.

  The page test asserts three cards, the caption and alt of each slot, and the order
  `tutorRole` then `tutor-screens` then `tutor-calculator` then `commitments`.

  Done: the locale test holds the nine new strings, and the page test passes.

- [ ] 2.3 Change the two live lines. Test: AC-6.

  `tutorRole.points[3]` and `faq.items[5].answer` in en and th take the strings of spec 6.4. The
  zh values take the new English lines (D-10). Add both lines to the locale test, and add the
  two old lines to its absent list.

  Done: the locale test passes and `grep -n "We do not publish income figures"` over the tutor
  locale file finds no hit.

- [ ] 2.4 Run the Phase 2 gates. Test: AC-11, AC-12, AC-16.

  The five gates of task 1.8 again, then
  `node scripts/ci/affected-apps.mjs --base ff028a710 --head <HEAD>`, which prints
  `["www-reading-advantage"]`.

  Done: every command exits 0.

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
