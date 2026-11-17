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
   check (spec D-9).
8. Every new string comes from spec section 5. The drafts stay marked `draft` in code comments.
   Daniel checks the Thai on the built page.
9. A task with `[b]` does not start until its gate passes. The gate evidence goes in the task
   record.
10. The picture task and the alt task ship in one change. The new picture cannot ship with the
    old alt (spec D-4).

## Phase 1: the become-a-tutor picture

Phase 1 starts at task 1.0 and waits for the PR alt gate. The picture, the box, and the alt ship in
one change. The phase ends at the PM page-check evidence, with no push.

- [b] 1.0 Gate: confirm the PR alt text and its fact gate. Test: AC-3.

  Gate items:

  1. The PM confirms the source file. The delivered file shows one tutor and three children. The
     PM words say five faces, and the PR alt names four schoolchildren. The file may be a variant
     other than Daniel's chosen picture (spec Q1).
  2. PR confirms the alt text of `tutorRole.alt` in en and th. The spec section 5.5 candidate reads
     "A tutor with four schoolchildren in a classroom; ...". PR must confirm or correct the count.
  3. PR handoff section 7 holds a fact gate line for the alt with result PASS (spec Q3).
  4. PR confirms the zh rule: the zh value equals en.

  Record the PR version, the date, and the gate result in this task. No code change in this task.

- [ ] 1.1 Red: pin the new block file, the 16:9 box, the size, and the alt. Test: AC-1, AC-2, AC-3, AC-4.

  File `apps/www-reading-advantage/src/app/[locale]/(marketing)/products/tutor-advantage/page.images.test.tsx`.

  1. Add a map `TUTOR` with one entry per locale: the src
     `/images/tutor-advantage-teach-class.webp` and the alt from spec section 5.5. The three
     locales share one file. The en and zh alts are equal. The th alt is the Thai text.
  2. Change the case "AC-22: the become-a-tutor block" (lines 243..254). It asserts
     `fileRefs(picture)` contains `TUTOR[locale].src` and the alt equals `TUTOR[locale].alt`.
  3. Add a case "AC-4: the become-a-tutor file". It reads
     `public/images/tutor-advantage-teach-class.webp` from `process.cwd()`, calls `webpSize`, and
     asserts `{ width: 1920, height: 1080 }`. It asserts the file size is at or below 300 KB.
  4. Add a case "AC-2: the become-a-tutor box". It renders the page in en, reads the `img` of the
     block, and asserts the class list holds `aspect-video` and does not hold `aspect-4/3`.
  5. The hero case (lines 184..194) and the book cases stay as they are.

  Red command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run "src/app/[locale]/(marketing)/products/tutor-advantage/page.images.test.tsx" --reporter=dot --silent=true --maxWorkers=1'`.
  Expect exit 1: the block still shows the hero file and the hero alt, the new file is missing, and
  the class is `aspect-4/3`. No failure is an import or syntax error.

- [ ] 1.2 Green: convert the source to the delivered webp. Test: AC-4.

  Run the command of spec section 4.2 from the repository root. The output path is
  `apps/www-reading-advantage/public/images/tutor-advantage-teach-class.webp`.

  Check: the check command of spec section 4.2 prints `(1920, 1080) WEBP` and a byte count at or
  below 307,200. The probe value is 190,298 bytes.

  The source check `sha256sum -c SHA256SUMS` in the picture folder exits 0. Record the result. Add
  no hash field.

- [ ] 1.3 Green: add the manifest entry, point the block at it, and set the box and the alt. Test: AC-1, AC-2, AC-3.

  Files:

  1. `src/lib/product-pictures.ts`: add the `tutorTeachClass` entry after `tutorSession` (lines
     56..61), with the JSDoc line of spec section 4.3.
  2. `src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx`: lines 329, 331, and 332
     read `productPictures.tutorTeachClass`. Line 334 reads
     `className="aspect-video w-full object-cover"`. The alt line and the `sizes` line stay.
  3. `src/locales/pages/products/tutor-advantage.ts`: set `tutorRole.alt` in en (line 153), th
     (line 490), and zh (line 827) to the gated text of spec section 5.5. The th value is the Thai
     text. The zh value equals en.

  Green command: the gate of task 1.1 exits 0. Then
  `pnpm --filter www-reading-advantage exec tsc --noEmit -p .` exits 0.

- [ ] 1.4 Gates: run the five app gates. Test: AC-9.

  Commands of spec section 6.1 for the www app: types, lint, build, the downline scan, and
  affected apps with `--base 80ac554b426551e5749f0e2cd500cbbf0eb93530`. Each holds its pass value
  of spec section 6.1.

  Save the output to `measure/runs/www_tutor_followups_20261118/` as
  `green-1.4-<short sha>.json` and `.log`.

- [ ] 1.5 Page-check evidence: capture `#become-a-tutor` at three widths and send it to the PM. Test: AC-10.

  1. `pnpm --filter www-reading-advantage build`.
  2. `pnpm --filter www-reading-advantage start` on port 3107.
  3. Capture the block at 390, 980, and 1280 px in en and th. Six captures.
  4. Write `checks.json` with the URL, the width, the block height, and the file name of each
     capture.
  5. Save all files to `measure/runs/www_tutor_followups_20261118/p1-captures/`.

  The check list at each width: the picture shows all faces and the book, the box is 16:9, the
  text does not overlap the picture, and the page has no horizontal scroll at 390 px.

  Send the folder path to the PM. The PM answer is the gate of task 3.2.

## Phase 2: the PR copy items

Each task takes one item and its gate. Tasks 2.1 to 2.4 cover the three items with a PASS gate.
Task 2.5 waits for the caption gate.

- [ ] 2.1 Red: pin the three gated items. Test: AC-5, AC-7, AC-8.

  File `src/__tests__/www-tutor-calculator.locale.test.ts`.

  1. `CALC_EN` gains `explain.needsOwnStudents` with the en text of spec section 5.1.
  2. `CALC_TH` gains the Thai text of spec section 5.1.
  3. Both fixtures change `graph.legCommissionBar` to the text of spec section 5.2. `CALC_EN` is
     also the zh expectation, so the zh value follows.
  4. The deep-equal cases at lines 363, 367, and 371 then fail on the missing key and the old
     label.

  File `src/lib/tutor-commission.adversarial.test.ts`.

  5. The case at line 384 expects `needsOwnStudents` for legs without own students. The case at
     line 553 keeps `zero` for a zero volume.

  File `src/__tests__/www-tutor-reedy-claim.test.tsx`.

  6. `PAGE_REEDY.th` (line 99) takes the New Thai of spec section 5.4.

  Red command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run src/__tests__/www-tutor-calculator.locale.test.ts
  src/lib/tutor-commission.adversarial.test.ts src/__tests__/www-tutor-reedy-claim.test.tsx
  --reporter=dot --silent=true --maxWorkers=1'`. Expect exit 1 on the four points above.

- [ ] 2.2 Green: add the fourth explain state. Test: AC-5.

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

  Green command: the Red command of task 2.1 exits 0 on the locale file. Then
  `pnpm --filter www-reading-advantage exec tsc --noEmit -p .` exits 0.

- [ ] 2.3 Green: change the leg-total label in three locales. Test: AC-7.

  File `src/locales/pages/products/tutor-advantage.ts`: `graph.legCommissionBar` at en 198, th
  535, and zh 874 takes the text of spec section 5.2.

- [ ] 2.4 Green: change the Thai Reedy feature line. Test: AC-8.

  File `src/locales/pages/products/tutor-advantage.ts:634`. The th value takes the New Thai of
  spec section 5.4. The en line 297 and the zh line 973 stay.

  Daniel checks this line on the live page after the push.

- [b] 2.5 Gate and Green: change `graph.caption`. Test: AC-6.

  Gate: PR handoff section 7 holds a fact gate line for the v0.6 caption with result PASS, or the
  PM accepts the text without one (spec Q2). Record the answer in this task.

  Red: the locale fixture asserts the caption text of spec section 5.3 in en and th. The zh value
  equals en. Run the locale test. Expect exit 1 on the old first clause.

  Green: `graph.caption` at en 194, th 530, and zh 870 takes the text of spec section 5.3. Only
  the first clause changes.

- [ ] 2.6 Gates: run the five app gates. Test: AC-9.

  The commands of spec section 6.1. Save the output as `green-2.6-<short sha>.json` and `.log` in
  `measure/runs/www_tutor_followups_20261118/`.

## Phase 3: gates, push, and live checks

- [ ] 3.1 Full suite: run the whole www suite with one worker. Test: AC-9.

  Command: `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter
  www-reading-advantage exec vitest run --maxWorkers=1'`.

  Pass: exit 0. Record the file count and the test count in the task. Save the log as
  `green-3.1-<short sha>.log`.

- [b] 3.2 Gate: the PM page check. Test: AC-10.

  The PM checks the built page at 390, 980, and 1280 px after the Phase 1 and Phase 2 changes. The
  PM checks `#become-a-tutor` and the calculator. The folder of task 1.5 is the input.

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
  `tutor-advantage-teach-class.webp`, `Commission of all legs`, and the new caption text, and no
  page holds `downline`, `ดาวน์ไลน์`, or "Tutor Advantage only".

  Save the run id, the URL, and the check output as `live-3.4-<short sha>.json` and `.log` in
  `measure/runs/www_tutor_followups_20261118/`.

## Closeout

- [ ] C.1 Move the track to `measure/archive/www_tutor_followups_20261118`, update the registry row, and record the closeout. Test: the closeout checker exits 0.

  The registry row names the commit range, the gate output, the page-check folder, the CD run, and
  the questions that stay open. The closeout runs after task 3.4.

## Questions carried to the PM

The three questions of spec section 10 stay in this plan until they close:

1. Q1: the file variant and the face and child count (task 1.0).
2. Q2: the `graph.caption` fact gate (task 2.5).
3. Q3: the alt delivery and its fact gate (task 1.0).

## Out of scope

- A crop of the picture at any ratio.
- A new hero file, a new gallery, or a new calculator state beyond `needsOwnStudents`.
- A change to the rate, the tax rule, the presets, or the graph rows.
- A zh translation written in this session.
- A change to another page, another locale file, or another app.
- A framework upgrade, a dependency change, or a lockfile change.
- A hash or checksum field.
- A deploy command, a Cloud Run change, or a public date.
