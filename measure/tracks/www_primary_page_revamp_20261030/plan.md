# Implementation Plan: www Primary Advantage page revamp

> **Track ID:** `www_primary_page_revamp_20261030` · **Spec:** [spec.md](./spec.md)
> **Request:** Daniel, Google Tasks, 2026-10-29 13:15 ICT: "the entire page needs to be revamped". PM assignment A-34, 2026-10-29 22:40 ICT, needed by 2026-11-02.
> **Branch:** `www/primary-page-revamp` from `master`, in `/home/daniebo/Desktop/rama-worktrees/www-primary-page`.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b]` at a human gate with `deferred:<owner>`.
- Each task line names its acceptance criterion in the form `Test: AC-n`.
- Each task follows `measure/workflow.md`: the test comes first, then the code, then one commit with `(track_id: www_primary_page_revamp_20261030)`. The commit header is 100 characters or less.
- Pathspec commits only. No `git add -A`, no `git commit -a`, no stash, no reset. Other sessions commit in this tree.
- Every heavy command runs through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- Tests run on changed files only, with one worker (vitest or jest with `--run` and a file filter).
- No push and no deploy. The push to `origin/master` and the deploy stay with Daniel.

## Phase 1: The new Primary Advantage page

- [~] 1.1 Red: write the content tests. Read the page in `en` and in `th`. Read the page in `zh` too: it shows the English copy. Check each brief string word for word, the links to `/pricing`, the contact page, and the Tutor Advantage page, the meta title and description, and the 16 image paths with their alt text. Check that no price, no date except the approved section 3 line, no free trial, no free term, and no discount appears. Check that none of the six Reading Advantage screens and none of the four old images appears. Test: AC-1, AC-7, AC-8, AC-13.
- [~] 1.2 Red run: run the content tests against the live page. The run must fail. Test: AC-2.
- [~] 1.3 Green crops: verify the SHA-256 of each of the 15 source files against the image list. Crop and scale the 16 images into `apps/www-reading-advantage/public/images/primary-advantage/`, lossless WebP or PNG, at the output size the list gives. Change no pixel of a screen. Add no hash field to any file. Test: AC-3, AC-4.
- [~] 1.4 Green QR check: decode the QR code of image 16. Record the decoded value in this plan. It must open the LINE Official account of `01-company/contact-and-locations.md` v2.1. Test: AC-5.
- [~] 1.5 Green page: build the page and the locale strings from the brief, word for word, in `en` and in `th`. Put the English copy in the `zh` file. Wire the buttons to `/pricing` and the contact page, and the text link to the Tutor Advantage page. Set the exact meta title and description. Test: AC-6, AC-13.
- [~] 1.6 Phase check: run lint, check-types, the changed-file tests, and the www build, each through the heavy-run script. Test: AC-9.
- [~] 1.7 Preview captures: capture desktop and phone, in `en` and in `th`, under `/home/daniebo/Desktop/a34-www-primary-captures/`. Test: AC-10.
- [b] 1.8 Daniel's look check and Thai check. The captures go to the PR session. Daniel checks every Thai line and the look of each image. deferred:daniel-look-check. Test: AC-11.
- [b] 1.9 Merge into local `master` and deploy with Daniel. Daniel pushes and deploys. deferred:daniel-deploy. Test: AC-12.

## Out of scope

- Push and deploy. Both stay with Daniel.
- New copy. A copy change goes back to the PR session.
- A real workbook photo. Image 1 stays a screenshot.
- The Thai check itself. Daniel checks every Thai line.
