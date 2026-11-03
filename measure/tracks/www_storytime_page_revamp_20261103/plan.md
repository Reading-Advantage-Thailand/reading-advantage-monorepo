# Implementation Plan: www Storytime Advantage page revamp

> **Track ID:** `www_storytime_page_revamp_20261103` · **Spec:** [spec.md](./spec.md)
> **Request:** Daniel, Google Tasks, 2026-11-03 16:38 ICT: "Primary page is updated and live. Next is the storytime page". PM assignment A-45, 2026-11-03 16:43 ICT.
> **Branch:** `www/storytime-page-revamp` from local `master`, in `/home/daniebo/Desktop/rama-worktrees/www-storytime-page`.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b]` at a human gate with `deferred:<owner>`.
- Each task line names its acceptance criterion in the form `Test: AC-n`.
- Each task follows `measure/workflow.md`: the test comes first, then the code, then one commit with `(track_id: www_storytime_page_revamp_20261103)`. The commit header is 100 characters or less and lower case.
- Pathspec commits only. No `git add -A`, no `git commit -a`, no stash, no reset. Other sessions commit in this tree.
- Every heavy command runs through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- Tests run on changed files only, with one worker.
- No push and no deploy. The push to `origin/master` and the deploy stay with Daniel.
- The build never commits `graph.db`. The phase gate checks that `git ls-files --error-unmatch graph.db` fails and that no staged path is `graph.db`.
- The content test fixture lives under `apps/www-reading-advantage/src/__tests__/fixtures/`.
- Task 1.0 gates every task that reads the new copy or the image list. The copy v0.4 is provisional and not accepted by Daniel.

## Phase 1: Inputs, Red tests, Green page, gates

- [b] 1.0 Receive the brief, the image list, and the Thai file. `deferred:pm`. Test: AC-1, AC-3, AC-5. Evidence: the track opened 2026-11-03 16:43 ICT. The PR session published the copy v0.4, the Thai file v0.1, and the image list v0.1 on 2026-11-03 between 17:25 and 17:27 ICT. The PM hand-off is still pending. The list gives no crop box and no output size. The PM orchestrator sends the hand-off, the accepted brief, and the updated image list by 2026-11-04. The session records each file path and version here when they arrive, and sets `A45_BRIEF_PATH`, `A45_THAI_PATH`, and `A45_IMAGE_LIST` from them. Tasks 1.1 to 1.6 start only after this task closes. The published copy v0.4 and product file v1.16 are the provisional sources. The accepted brief is the copy authority.
- [ ] 1.1 Red: write the content tests. Read the page in `en`, in `th`, and in `zh`. Check each brief string word for word, the two `/contact` links, the meta title and description, each image path with its alt text, the seven containers (`st-hero`, `st-section-1` to `st-section-5`, `st-cta`), and the absence of the old roadmap strings of spec section 5 and every live stock image. `zh` checks the English copy. Check that no date, price, outcome claim, free trial, free term, or discount appears. Check the banned strings of AC-15. Add the drift guard: every fixture string appears in the refreshed brief. Test: AC-1, AC-6, AC-7, AC-12, AC-13, AC-14, AC-15.
    - New `apps/www-reading-advantage/src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx`.
    - New fixture `apps/www-reading-advantage/src/__tests__/fixtures/storytime-page-expected.ts`.
    - New `apps/www-reading-advantage/src/lib/__tests__/storytime-page-images.test.ts` (`@vitest-environment node`). Read `A45_IMAGE_LIST` (the accepted image list version), `A45_BRIEF_PATH` (the accepted brief), `A45_THAI_PATH` (the accepted Thai file), and `A45_REQUIRE_SOURCES`. When one of the three paths is unset, the test skips with a message. With `A45_REQUIRE_SOURCES=1`, it fails with a named assertion message that names the missing variable. Task 1.0 records the paths, and the gates export them. The list holds absolute source paths. It asserts: each row has a source and a hash; each source hash matches; the image folder holds one file per row; each file has the list size and the `VP8L` chunk; each unscaled crop equals the source crop byte for byte in raw RGBA; each scaled crop stays within a mean absolute difference of 2.0 from a lanczos3 resize; the repository diff adds no 64-character hash line. The drift guard reads the English strings from `A45_BRIEF_PATH` and the Thai strings from `A45_THAI_PATH`.
    - Rewrite `apps/www-reading-advantage/src/app/[locale]/(marketing)/products/storytime-advantage/page.test.tsx` for the seven containers. Remove the four old decoration assertions.
    - Keep the live locale key paths: `metadata.title`, `metadata.description`, `hero.title`, `hero.subtitle`, `hero.description`, `hero.comingSoon`, `heroAlt`, `classroomAlt`, `coreValue.*`, `keyFeatures.*`, `teacherTools.*`, `faq.questions[0..4]`, `cta.*`, `adaptiveEngine.*`, and `eyebrows.*`. Each other image gets a key under `images`, in camelCase from the list target name. `heroAlt` takes the hero alt text, `adaptiveEngine.alt` takes the cover alt text, and `classroomAlt` takes the cast alt text. The page and the `zh` file keep the same paths. `phase-4-browser-regressions.red.test.tsx` reads `faq.questions` and needs no change.
    - The claims scanner flags the terms of spec section 7. It has `control:` tests that inject each term class and expect a flag. It does not flag "date", "no public date", or the durations.
    - Update the storytime row of `apps/www-reading-advantage/src/__tests__/phase-2-seo-remaining-static.red.test.ts` to read `metadata.title` and `metadata.description`.
    - Remove `storytime-advantage` from `NONEXISTENT_APPS` in `apps/www-reading-advantage/src/lib/__tests__/phase-w3-claims.test.ts`. Keep every other app and every positive control.
- [ ] 1.2 Red run: run the content tests against the live page. The run must fail for assertion reasons only. Record the exit code, the counts, and the error-type count. Test: AC-2. Evidence: pending.
- [ ] 1.3 Green crops: check the SHA-256 of each source file against the image list. Crop and scale each image into `apps/www-reading-advantage/public/images/storytime-advantage/`, lossless WebP, at the output size the list gives. Change no pixel of a screen. Add no hash field to any file. Test: AC-3, AC-4. Evidence: pending.
    - Wait for the PM hand-off. List v0.1 gives no crop box and no output size. The build does not choose either. The hand-off adds both to the list.
    - Write `apps/www-reading-advantage/scripts/crop-storytime-page-images.ts`. Copy the structure of `scripts/crop-primary-page-images.ts`: read the image table, check each SHA-256 before the first crop, write lossless WebP with `sharp`, and keep `--verify-only`. Do not change the Primary script. The list holds absolute source paths, so the script reads each path as it stands.
    - Command: `pnpm exec tsx scripts/crop-storytime-page-images.ts --list "$A45_IMAGE_LIST"`.
    - If the accepted list has another table shape, update the parser and record the shape here before the first crop.
- [ ] 1.4 Green page: build the page and the locale strings from the refreshed brief, word for word, in `en` and in `th`. Put the English copy in the `zh` file. Wire the two call-to-action buttons to `/contact`. Set the exact meta title and description. Remove every live stock image and the old roadmap strings of spec section 5. Test: AC-5, AC-7, AC-12, AC-13. Evidence: pending.
- [ ] 1.5 Phase check: run lint, check-types, the changed-file tests, and the www build, each through the heavy-run script. Confirm that `git ls-files --error-unmatch graph.db` fails and that no staged path is `graph.db`. Test: AC-8, AC-14. Evidence: pending.
- [ ] 1.6 Preview captures: capture desktop and phone, in `en` and in `th`, under `/home/daniebo/Desktop/a45-www-storytime-captures/`. Check that each image loads and that the page does not scroll sideways. Test: AC-9. Evidence: pending.
- [b] 1.7 Daniel's look check and Thai check on the captures of task 1.6. `deferred:daniel-look`. Test: AC-10. Evidence: pending.
- [b] 1.8 Merge into local `master` and Daniel's push. `deferred:daniel-deploy`. Merge only after Daniel's pass. Daniel pushes and deploys. Test: AC-11. Evidence: pending.

## Open inputs

| # | Input | Default | Owner |
| --- | --- | --- | --- |
| Q1 | The PM hand-off: the accepted brief, the Thai file, and the image list | The track waits. The published v0.4, Thai v0.1, and image list v0.1 are provisional only. | PM orchestrator / PR session |
| Q2 | The target of the "Learn More" button | `/contact`, as the live page has today | PR session |
| Q3 | The Thai hand-off line in FAQ A5 | The Thai file keeps the English statement word for word. Daniel decides whether he wants a Thai version. | Daniel / PR session |
| Q4 | A games section or a demo section | Keep none. The live page has none. | Daniel |
| Q5 | The crop box and the output size of each image | The build waits for the updated list. It does not choose. | PM orchestrator / PR session |

## Out of scope

- Push and deploy. Both stay with Daniel.
- New copy. A copy change goes back to the PR session.
- A printed-book photo and a classroom photo. The image list records both gaps.
- The Thai check itself. Daniel checks every Thai line.
- A games section or a demo section without a new owner decision.
- The Storytime app build.
