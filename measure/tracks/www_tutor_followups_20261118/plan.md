# Implementation Plan: www Tutor Advantage follow-ups (picture and copy)

> **Track ID:** `www_tutor_followups_20261118` · **Spec:** [spec.md](./spec.md)
> **Source:** PM order 2026-11-18 for the Monorepo www lane (orchestrator session `ses_e1653aa5cffeDR7OhMeOx59iEZ`). Owner words: Daniel, Google Tasks `LU1FRkk2`, 2026-11-18.
> **Parent:** `measure/archive/www_tutor_calculator_20261117/`, closed at `80ac554b4`. Its spec section 10 and its plan section "Answers owed to PR" list the five open items.
> **Page:** `/products/tutor-advantage` in en, th, and zh, `apps/www-reading-advantage`.
> **Branch:** `feat/www-tutor-followups`, from `origin/master` at `80ac554b426551e5749f0e2cd500cbbf0eb93530`.
> **Phase base:** `80ac554b426551e5749f0e2cd500cbbf0eb93530`.

## Rules for this plan

1. Markers: `[ ]` pending, `[~]` in progress, `[x]` done, `[b]` at a human or PR gate.
2. Each task names its acceptance criterion as `Test: AC-n`, and each criterion has one command
   or one review that can fail.
3. Each task follows `measure/workflow.md`: the failing test first, then the code, then one commit
   with `(track_id: www_tutor_followups_20261118)`. The commit header is 100 characters or less.
4. Pathspec commits only. No `git add -A`, no `git commit -a`, no stash, and no reset.
5. Tests read no file outside the repository. Tests compare no hash.
6. Every heavy command runs as
   `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
7. No deploy command and no Cloud Run change. One www-only fast-forward push follows the PM page
   check (spec D-10).
8. Every new string comes from spec section 5. The drafts stay marked `draft` in code comments.
   Daniel checks the Thai on the built page.
9. A task with `[b]` does not start until its gate passes. The gate evidence goes in the task
   record.
10. Each picture ships with its alt in one change. A new picture cannot ship with an old alt
    (spec D-5).

## Phase 1: the two pictures

Phase 1 starts at task 1.2. Task 1.0 and task 1.1 passed on 2026-11-18. The two pictures, the two
entries, the boxes, and the two alts ship in one change. The phase ends at the PM page-check
evidence, with no push. The picture work does not wait for `graph.caption` (spec section 2).

- [x] 1.0 Gate: confirm the PR alt text for the block and its fact gate. Test: AC-3. Done: 2026-11-18. `c8d750d56`

  Answers from the orchestrator, 2026-11-18, from the image and PR handoff version 0.8:

  1. The file is the right one. It is Daniel's choice, and `sha256sum -c SHA256SUMS` exits 0. It
     shows one tutor and three children, which is four faces. The words "five faces" and "four
     children" were wrong (spec Q1).
  2. PR handoff version 0.8 section 8.6 is the delivered alt for `tutorRole.alt` (lines 386..392).
     The en line reads "A tutor with three schoolchildren in a bright classroom; one holds the
     Primary Advantage Origins 2 workbook, another the student app on a phone." Spec section 5.5
     holds the en and th lines.
  3. The alt fact gate passed on the third pass on 2026-11-18 (PR handoff section 7). The first
     pass found the child count, and the text now reads "three schoolchildren".
  4. The zh value equals en.

  No code change in this task.

- [x] 1.1 Gate: confirm the PR hero alt text and its fact gate. Test: AC-14. Done: 2026-11-18. `3cc535884`

  Record: PR handoff version 1.0, advantage-pr commit `5aa6d6ee`, 2026-11-18. Section 8.7
  delivers `heroExtra.imageAlt`. Section 7 reads "Fact gate 2026-11-18 (the hero alt lines of
  section 8.7): PASS, no fault."

  The en line reads "A tutor smiles at three schoolchildren at a small table in a bright
  classroom; a girl holds the Primary Advantage Origins 2 workbook, a boy the student app on a
  phone." Spec section 5.6 holds the en and th lines. The zh value equals en.

  No code change in this task.

- [x] 1.2 Red: pin the two pictures, the two entries, the old-file rule, and the sizes. Test: AC-1, AC-2, AC-3, AC-14, AC-15, AC-16, AC-17, AC-18. `9a1e001fb`

  File `apps/www-reading-advantage/src/app/[locale]/(marketing)/products/tutor-advantage/page.images.test.tsx`.

  1. Replace the `HERO` map (lines 47..59) with two maps. `HERO` holds
     `/images/tutor-advantage-hero-2026-11-06.webp` and `text(locale, "heroExtra.imageAlt")`.
     `TUTOR` holds `/images/tutor-advantage-teach-class.webp` and `text(locale, "tutorRole.alt")`.
     The en and zh values are equal. The th values are the Thai text.
  2. The hero case (lines 184..194) asserts `HERO[locale].src` and `HERO[locale].alt`. AC-14.
  3. The case "AC-22: the become-a-tutor block" (lines 243..254) asserts `TUTOR[locale].src` and
     `TUTOR[locale].alt`. AC-15.
  4. Add a case "AC-16: no image uses the old hero file". It reads every `img` of the page and
     asserts no reference contains `tutor-advantage-hero.jpg`. AC-16.
  5. Add a case "AC-17: no two content images share a file". It maps each `img` to its file, drops
     the files under `/media/brand/`, and asserts the list has no duplicate. AC-17.
  6. Add a case "AC-18: both pictures have the expected size". It reads
     `public/images/tutor-advantage-hero-2026-11-06.webp` and
     `public/images/tutor-advantage-teach-class.webp` with `webpSize`, asserts `{ width: 1920,
     height: 1080 }` for each, and asserts each size is at or below 300 KB. AC-18.
  7. Add a case that the block box holds `aspect-video` and not `aspect-4/3` (spec 4.3). AC-2.
  8. The three book cases and the banned-file case stay as they are.

  File `src/app/[locale]/(marketing)/products/tutor-advantage/page.phase3.adversarial.test.tsx`.

  9. `expectedContentImages` (lines 352 and 357) takes the two new files, one per block.
  10. The preload case (line 437) expects `/images/tutor-advantage-hero-2026-11-06.webp` in
      `imagesrcset`.

  Red command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run "src/app/[locale]/(marketing)/products/tutor-advantage/page.images.test.tsx"
  "src/app/[locale]/(marketing)/products/tutor-advantage/page.phase3.adversarial.test.tsx" --reporter=dot
  --silent=true --maxWorkers=1'`.

  Expect exit 1: the hero and the block both show the old file, the new files are missing, two
  content images share one file, and the class is `aspect-4/3`. No failure is an import or syntax
  error.

  Done: 2026-11-18 at `9a1e001fb`. The combined Red command (tasks 1.2 and 2.1, nine test files)
  exited 1 on the new expectations only. `tsc --noEmit -p .` exited 0. Evidence:
  `measure/runs/www_tutor_followups_20261118/red-1.2-2.1.log`.

- [x] 1.3 Green: convert the two sources to the delivered webp files. Test: AC-18. `fa8ad4fd3`

  Run the command of spec section 4.2 from the repository root. The outputs are
  `apps/www-reading-advantage/public/images/tutor-advantage-hero-2026-11-06.webp` and
  `apps/www-reading-advantage/public/images/tutor-advantage-teach-class.webp`.

  Check: the check command of spec section 4.2 prints `(1920, 1080)` for each file. The probe
  values are 165,522 bytes for the hero and 190,298 bytes for the block. Each size is at or below
  307,200 bytes.

  The source check `sha256sum -c SHA256SUMS` in the picture folder exits 0 for both sources.
  Record the result. Add no hash field.

  Done: 2026-11-18 at `fa8ad4fd3`. The source check exited 0 for both sources. The check command
  printed `(1920, 1080)` for each file, 165,522 bytes for the hero and 190,298 bytes for the block.
  Evidence: `measure/runs/www_tutor_followups_20261118/green-1.3-2.5.log`.

- [x] 1.4 Green: split the manifest and point the hero and the block at their files. Test: AC-1, AC-2, AC-3, AC-14, AC-15. `fa8ad4fd3`

  Files:

  1. `src/lib/product-pictures.ts`: replace `tutorSession` (lines 56..61) with `tutorHero` and
     `tutorTeachClass`, with the JSDoc lines and the values of spec section 4.3.
  2. `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx`: line 195 reads
     `picture={productPictures.tutorHero}`, and `priority` stays. Lines 329, 331, and 332 read
     `productPictures.tutorTeachClass`. Line 334 reads
     `className="aspect-video w-full object-cover"`. The two alt lines and the `sizes` line stay.
  3. `src/locales/pages/products/tutor-advantage.ts`: set `tutorRole.alt` in en (line 153), th
     (line 490), and zh (line 827) to the text of spec section 5.5. Set `heroExtra.imageAlt` in
     en (line 19), th (line 356), and zh (line 693) to the text of spec section 5.6. The th values
     are the Thai text. The zh values equal en.

  Green command: the command of task 1.2 exits 0. Then
  `pnpm --filter www-reading-advantage exec tsc --noEmit -p .` exits 0.

  Done: 2026-11-18 at `fa8ad4fd3`. The targeted command and `tsc --noEmit -p .` exit 0.
  Evidence: `measure/runs/www_tutor_followups_20261118/green-1.3-2.5.log`.

- [x] 1.5 Green: remove the old hero file. Test: AC-16. `fa8ad4fd3`

  1. Run the scan of spec section 4.5:
     `rg -n "tutor-advantage-hero\.jpg" apps/www-reading-advantage/src --glob '!**/*.test.*'`.
     Pass: no output.
  2. Run `git rm apps/www-reading-advantage/public/images/tutor-advantage-hero.jpg`.
  3. If the scan finds a source reference, keep the file and record the path here. AC-16 still
     requires that no `img` shows it.

  Done: 2026-11-18 at `fa8ad4fd3`. The scan printed nothing, and the old file is deleted.
  Evidence: `measure/runs/www_tutor_followups_20261118/green-1.3-2.5.log`.

- [x] 1.6 Gates: run the five app gates. Test: AC-9. `ad055b9e2`

  Commands of spec section 6.1 for the www app: types, lint, build, the downline scan, and
  affected apps with `--base 80ac554b426551e5749f0e2cd500cbbf0eb93530`. Each holds its pass value
  of spec section 6.1.

  Save the output to `measure/runs/www_tutor_followups_20261118/` as
  `green-1.6-<short sha>.json` and `.log`.

  Done: 2026-11-18 at `ad055b9e2`. Types exit 0, lint exit 0, build exit 0 on the re-run after the
  known Next.js security reminder, the downline scan exit 1 with no output, and affected apps lists
  `www-reading-advantage` only. The file pair `green-1.6-ad055b9e2.json` and `.log` covers task 1.6
  and task 2.6.

- [ ] 1.7 Page-check evidence: capture the hero and `#become-a-tutor` at three widths and send the folder to the PM. Test: AC-10.

  1. `pnpm --filter www-reading-advantage build`.
  2. `pnpm --filter www-reading-advantage start` on port 3107.
  3. Capture the hero and the block at 390, 980, and 1280 px in en and th. Twelve captures.
  4. Write `checks.json` with the URL, the width, the block, the picture height, and the file name
     of each capture.
  5. Save all files to `measure/runs/www_tutor_followups_20261118/p1-captures/`.

  The check list at each width: the picture shows all four faces and the book, the frame is 16:9
  with no crop, the text does not overlap the picture, and the page has no horizontal scroll at
  390 px.

  Send the folder path to the PM. The PM answer is the gate of task 3.2.

## Phase 2: the PR copy items

Each task takes one item and its gate. Every item now holds a PASS gate. Task 2.1 pins the four
items as failing tests.

- [x] 2.1 Red: pin the four copy items. Test: AC-5, AC-6, AC-7, AC-8. `9a1e001fb`

  File `src/__tests__/www-tutor-calculator.locale.test.ts`.

  1. `CALC_EN` gains `explain.needsOwnStudents` with the en text of spec section 5.1.
  2. `CALC_TH` gains the Thai text of spec section 5.1.
  3. Both fixtures change `graph.legCommissionBar` to the text of spec section 5.2. `CALC_EN` is
     also the zh expectation, so the zh value follows.
  4. Both fixtures change `graph.caption` to the text of spec section 5.3. Both sentences change.
  5. The deep-equal cases at lines 363, 367, and 371 then fail on the missing key and the old
     label and caption.

  File `src/lib/tutor-commission.adversarial.test.ts`.

  6. The case at line 384 expects `needsOwnStudents` for legs without own students. The case at
     line 553 keeps `zero` for a zero volume.

  File `src/__tests__/www-tutor-reedy-claim.test.tsx`.

  7. `PAGE_REEDY.th` (line 99) takes the New Thai of spec section 5.4.

  Red command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run src/__tests__/www-tutor-calculator.locale.test.ts
  src/lib/tutor-commission.adversarial.test.ts src/__tests__/www-tutor-reedy-claim.test.tsx
  --reporter=dot --silent=true --maxWorkers=1'`. Expect exit 1 on the four points above.

  The orchestrator extended this Red pass with two more files (orchestrator answer 2026-11-18):
  `src/lib/tutor-commission.test.ts` (the two legs-without-own-students cases take
  `needsOwnStudents`, spec D-6) and `src/lib/tutor-commission.settlement.adversarial.test.ts`
  (line 613 takes `needsOwnStudents` for an unpaid tutor with legs and a volume). The zh
  `calculator` expectation is `CALC_EN` with `explain.needsOwnStudents` replaced by the zh draft
  of spec section 5.1 (D-11). The case at adversarial line 384 keeps `zero`: its network volume is
  0, so it stays the first branch of D-6; the `needsOwnStudents` pin is a new case beside it.

  Done: 2026-11-18 at `9a1e001fb`. The combined Red command (nine test files) exited 1 on the new
  expectations only. `tsc --noEmit -p .` exited 0. Evidence:
  `measure/runs/www_tutor_followups_20261118/red-1.2-2.1.log`.

- [x] 2.2 Green: add the fourth explain state. Test: AC-5. `fa8ad4fd3`

  Files:

  1. `src/lib/tutor-commission.ts:207..212`: the return type gains `"needsOwnStudents"`. The
     second condition returns `"needsOwnStudents"` and no longer `"zero"`. The JSDoc line changes
     to name the four states.
  2. `src/components/marketing/tutor-commission-calculator.tsx`: the `copy.explain` type (line 50)
     gains `needsOwnStudents: string`. The render at line 472 needs no change. It already reads
     `copy.explain[variant]`.
  3. `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx:107..111`: the `explain`
     object gains `needsOwnStudents: key("calculator.explain.needsOwnStudents")`.
  4. `src/locales/pages/products/tutor-advantage.ts`: add the key under `calculator.explain` in
     en, th, and zh. The zh text is the zh draft of spec section 5.1, with a `draft` comment.

  Green command: the explain assertions of the Red command pass. The full locale file passes after
  task 2.5. Then `pnpm --filter www-reading-advantage exec tsc --noEmit -p .` exits 0.

  Done: 2026-11-18 at `fa8ad4fd3`. The Green command and `tsc --noEmit -p .` exit 0.
  Evidence: `measure/runs/www_tutor_followups_20261118/green-1.3-2.5.log`.

- [x] 2.3 Green: change the leg-total label in three locales. Test: AC-7. `fa8ad4fd3`

  File `src/locales/pages/products/tutor-advantage.ts`: `graph.legCommissionBar` at en 198, th
  535, and zh 874 takes the text of spec section 5.2.

  Done: 2026-11-18 at `fa8ad4fd3`. The Green command exits 0. Evidence:
  `measure/runs/www_tutor_followups_20261118/green-1.3-2.5.log`.

- [x] 2.4 Green: change the Thai Reedy feature line. Test: AC-8. `fa8ad4fd3`

  File `src/locales/pages/products/tutor-advantage.ts:634`. The th value takes the New Thai of
  spec section 5.4. The en line 297 and the zh line 973 stay.

  Daniel checks this line on the live page after the push.

  Done: 2026-11-18 at `fa8ad4fd3`. The Green command exits 0. Evidence:
  `measure/runs/www_tutor_followups_20261118/green-1.3-2.5.log`.

- [x] 2.5 Green: change `graph.caption` in three locales. Test: AC-6. `fa8ad4fd3`

  Gate record: PR handoff version 1.0 section 7 reads "Fact gate 2026-11-18 (the `graph.caption`
  line of v0.6): the first pass found one fault. The caption payout is the figure before tax, so
  the line now says "before tax". The second pass: PASS." The text is spec section 5.3.

  File `src/locales/pages/products/tutor-advantage.ts`: `graph.caption` at en 194, th 530, and zh
  870 takes the text of spec section 5.3.

  Both sentences change. The en and zh values read "Each leg has its own bar: ... Your payout
  before tax is ...". The th value reads "แต่ละสายมีแท่งของตัวเอง: ... ยอดจ่ายของคุณก่อนหักภาษี ...".
  The zh value equals en.

  Done: 2026-11-18 at `fa8ad4fd3`. The Green command exits 0. Evidence:
  `measure/runs/www_tutor_followups_20261118/green-1.3-2.5.log`.

- [x] 2.6 Gates: run the five app gates. Test: AC-9. `ad055b9e2`

  The commands of spec section 6.1. Save the output as `green-2.6-<short sha>.json` and `.log` in
  `measure/runs/www_tutor_followups_20261118/`.

  Done: 2026-11-18 at `ad055b9e2`. Task 2.6 runs the same five gates as task 1.6 at the same HEAD.
  The file pair `green-1.6-ad055b9e2.json` and `.log` covers both tasks.

## Phase 3: gates, push, and live checks

- [~] 3.1 Full suite: run the whole www suite with one worker. Test: AC-9.

  Command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run --maxWorkers=1'`.

  Pass: exit 0. Record the file count and the test count in the task. Save the log as
  `green-3.1-<short sha>.log`.

  Blocked on 2026-11-18 at `ad055b9e2`: the suite exits 1. Two committed test files still hold the
  old contract. `src/__tests__/products-page-pictures.red.test.tsx:69` rejects every
  `productPictures` src that matches `/2026-11-06/`, and it now catches the spec-mandated
  `/images/tutor-advantage-hero-2026-11-06.webp`. `tutor-commission-calculator.legs.adversarial
  .test.tsx` holds the old three-state explain list at line 161 and the old `zero` state at lines
  609 and 618. The counts sit in `green-3.1-ad055b9e2.log`.

- [b] 3.2 Gate: the PM page check. Test: AC-10.

  The PM checks the built page at 390, 980, and 1280 px after the Phase 1 and Phase 2 changes. The
  PM checks the hero and `#become-a-tutor`. The folder of task 1.7 is the input.

  Pass: the PM sends a PASS with the folder path of its captures. No push runs before this task.

- [ ] 3.3 Push www-only. Test: AC-11.

  One fast-forward push to `origin/master`. The changed paths are `apps/www-reading-advantage/**`
  and `measure/**`.

  Checks before the push: `git fetch origin master`, `git log --oneline origin/master..HEAD`,
  `git diff --name-only origin/master..HEAD`, and `git merge-base --is-ancestor origin/master
  HEAD`.

  Record the pushed commit and the previous `origin/master` in the task.

- [ ] 3.4 CD watch and live checks. Test: AC-12.

  1. Find the CD run "CD — www-reading-advantage" for the pushed commit with
     `gh run list --workflow=cd-www-reading-advantage.yml --limit 5`.
  2. Watch it with `gh run watch <id> --exit-status`.
  3. Read the service URL with the command of spec section 6.4.
  4. Check the three pages with `curl -s -o /dev/null -w "%{http_code}"` and the content checks of
     spec section 6.4.

  Pass: the CD run succeeds, each page answers 200, each page holds
  `tutor-advantage-hero-2026-11-06.webp`, `tutor-advantage-teach-class.webp`, `Commission of all
  legs`, and the new caption text, and no page holds `tutor-advantage-hero.jpg`, `downline`,
  `ดาวน์ไลน์`, or "Tutor Advantage only".

  Save the run id, the URL, and the check output as `live-3.4-<short sha>.json` and `.log` in
  `measure/runs/www_tutor_followups_20261118/`.

## Closeout

- [ ] C.1 Move the track to `measure/archive/www_tutor_followups_20261118`, update the registry row, and record the closeout. Test: the closeout checker exits 0.

  The registry row names the commit range, the gate output, the page-check folder, the CD run, and
  the questions that stay open. The closeout runs after task 3.4.

## Questions carried to the PM

None. All four questions of spec section 10 closed on 2026-11-18. Q1 and Q3 closed at task 1.0.
Q2 closed at task 2.5 and Q4 at task 1.1, both from PR handoff version 1.0, commit `5aa6d6ee`.

## Out of scope

- A crop of the picture at any ratio.
- A new hero file, a new gallery, or a new calculator state beyond `needsOwnStudents`.
- A change to the rate, the tax rule, the presets, or the graph rows.
- A zh translation written in this session.
- A change to another page, another locale file, or another app.
- A framework upgrade, a dependency change, or a lockfile change.
- A hash or checksum field.
- A deploy command, a Cloud Run change, or a public date.
