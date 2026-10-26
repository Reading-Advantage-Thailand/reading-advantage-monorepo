# Spec — Rehearsal 3 and the command sheet for the next Primary cutover

Track ID: `primary_parity_rehearsal3_20261011`
Type: chore (Classic FR list)
Triage rows: PUB-03 (owner choice "port", "before"), CNT-01 (start condition), and the ETL and
runbook changes of the other members.

## Overview

The cutover of 2026-10-11 stopped after step C10, because the build lacked legacy behavior. The
other members of the set close the "before cutover" rows. This track is the last member. It collects
the ETL and runbook changes of the members, exports the legacy contact messages for the sales team,
runs the side-by-side acceptance of the whole build and the owner's look check, and runs rehearsal 3
on the pattern of rehearsal 2. It then writes the command sheet for the next cutover. The owner sets
the cutover date after rehearsal 3 passes.

Rehearsal 3 tests the final build. No change to the Primary build inputs is allowed after it
(shared decision of 2026-10-11).

## Track Set

This track is member 9 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_records_20261011, primary_parity_acceptance_20261011, primary_parity_quick_fixes_20261011, primary_parity_cleanup_20261011, primary_parity_class_books_20261011, primary_parity_staff_student_view_20261011, primary_parity_admin_dashboard_20261011, primary_parity_teacher_home_20261011, primary_parity_system_dashboard_20261011, primary_parity_school_management_20261011, primary_parity_stories_20261011, primary_parity_read_along_20261011, primary_parity_lesson_repeat_20261011, primary_parity_lesson_games_20261011, primary_parity_print_lesson_20261011, primary_parity_pwa_20261011, primary_parity_qr_path_20261011, primary_public_pages_20261007. The shared decisions and the start gate in the set overview apply to this track.

`primary_public_pages_20261007` is outside the set. It must finish its Phase 4 (Thai copy, cn and tw
review, demo-seed retakes) and its Phase 5 (tests, tsc, ESLint, merge into integration) before this
track starts. Its plan says "Merge into integration after the cutover passes"; the owner decision on
PUB-01 ("extend", "before", 2026-10-11) changes that: the merge comes before rehearsal 3.

## Verified Facts (2026-10-11, integration `ca8869cea`)

- G-1. **Pattern of rehearsal 2.** `measure/tracks/primary_legacy_data_migration_20261004/rehearsal-2-20261010.md`
  and `cutover-commands-20261011.md` give steps R1 to R9: backup, drop and create `primary_v2` (owner),
  build context of the frozen commit, ETL in Cloud Build (`--region=asia-southeast1`), `after-etl.sh`
  (owner), image with no traffic and a tag, browser check at the tag URL and five public files, a
  local copy for graph and Workbooks, and the timings.
- G-2. **ETL source.** `apps/primary-advantage/cloudbuild-etl.yaml:5-6` runs the ETL "from the live
  legacy database (read only) into the target". Its inputs come from Secret Manager
  (`PRIMARY_ETL_ROLES`, `PRIMARY_ETL_USERNAMES`, `PRIMARY_ETL_TEACHERS`). Both
  `cloudbuild-etl.yaml` and `cloudbuild.yaml` require migration `0071_primary_temporary_password`;
  `0071` is the highest file in `packages/db/drizzle/`.
- G-3. **State after 2026-10-11.** `master` is `0a29d574e` (the merge of 2026-10-11) and holds
  integration up to `dc353d121`. `primary_v2` holds the ETL of 2026-10-11 and 21 temporary
  passwords. Revision `primary-advantage-app-00130-daq` has the tag `cutover` with no traffic. The
  legacy trigger `primary-advantege-prod` is off and the five scheduler jobs are paused (shared
  decisions Q-04 and Q-05).
- G-4. **Private files that block a rerun.** `~/Desktop/primary-cutover-inputs/` already has
  `handout-cutover-primary_v2.csv`, and `after-etl.sh` stops when its hand-out file exists ("Move it
  away first"). It also has `check-passwords-cutover.csv`; the browser check signs in with a kept
  password from `NEW_PASSWORDS_OUT` when the file has the account. So a rerun with the label
  `cutover` and the old files fails.
- G-5. **Browser check.** `.qa-tmp/rehearsal1-gonogo.mjs` (main checkout, untracked) is the C10
  check. `primary_parity_acceptance_20261011` copies it to `scripts/primary-parity/cutover-check.mjs`
  (outside the build inputs). It has no check for a class book, a lesson of a class book, a story, or
  the staff student view.
- G-6. **Contact messages.** The legacy table `contact_messages` (`prisma/schema.prisma:888-905`:
  `id`, `name`, `institution`, `email`, `inquiry`, `message`, `user_id`, `status`, `created_at`,
  `updated_at`) exists from 2026-05-13 (legacy migration `20260513163754_add_contact_message`). The
  ETL drops it: "no target; export for the sales team is an owner decision"
  (`packages/db/src/migrations-data/primary-legacy-import.ts:72`). The messages come from a public
  form, so a cell can start with `=`, `+`, `-`, or `@`. The hand-out writer guards such a cell with a
  leading quote mark (`apps/primary-advantage/lib/cutover/temporary-passwords.ts:65-68`).
- G-7. **Injector.** `~/Desktop/Workbooks/measure/tracks/primary_injector_20261001/plan.md` Phase 4:
  `--target new` has a dry run only ("Open: a real write after the cutover").
- G-8. **Calendar.** `docs/deployment/primary-cutover-migration-spec.md` §11 still gives Oct 20 as
  the last cutover date ("If the gate has not passed, Primary stays on the legacy build for semester
  2. The next window is the March 2027 break.") and a freeze from Oct 22.
- G-9. **Image life.** The image repository deletes images older than 30 days and keeps the 5 newest
  (`rehearsal-2-20261010.md`, "Checks for Sunday").
- G-10. **Changes known from the set overview.** Stories: stories, chapters, and their MCQ, SAQ, and
  LAQ rows in the ETL (the production run of 2026-10-07 skipped 32,960 MCQ, 16,480 SAQ, 16,480 LAQ,
  3,296 flashcard-source rows, and 5 flashcard cards of chapters; `etl-run-20261007-production.md:67-78`).
  Class books: the catalogue and guide imports after the ETL (the draft of that member adds
  `apps/primary-advantage/cloudbuild-catalogue.yaml` and `runbook-changes.md`). The other members
  state their changes in their specs (brief rule 9).

## Functional Requirements

- FR-1. **Start gate.** The track starts when: (a) every member of the "Depends on" line is complete
  (registry entry `[x]`, or the folder is in `measure/archive/`); (b) `primary_public_pages_20261007`
  is merged into integration; (c) the Workbooks session reports CNT-01: one real write of
  `inject-lessons.ts --target new` and a passing `verify-lessons.ts --target new` on a local
  rehearsal copy at the migrations of the integration head. This track does not write content; it
  waits for that report.
- FR-2. **Change list.** Write `measure/tracks/primary_parity_rehearsal3_20261011/rehearsal-3-changes.md`.
  For each member and for the public pages: the ETL change, the new Cloud Build file or step, the
  runbook or command change, the new migration and its number, the `--required-migration` value in
  `cloudbuild.yaml` and `cloudbuild-etl.yaml`, a new environment value or secret, the `DROPPED_TABLES`
  line that changes, and the browser check block. Read each member's spec, plan, and
  `runbook-changes.md` (if it has one). Record "none" where a member has no change.
- FR-3. **Contact export (PUB-03).** Export the legacy `contact_messages` rows once, to a private CSV
  outside every repository, for the sales team:
  1. Source: a local restore of the final backup of the cutover (the new C4), so the file has every
     message up to the last legacy state. The agent needs no database password.
  2. Columns: `id`, `created_at`, `status`, `inquiry`, `name`, `institution`, `email`, `message`, in
     `created_at` order. A text cell that starts with `=`, `+`, `-`, `@`, a tab, or a return gets a
     leading quote mark (the rule of G-6), in the SQL of the export.
  3. File: `~/Desktop/primary-cutover-inputs/contact-messages-<yyyymmdd>.csv`, mode 600. Only the row
     count goes into the repository.
  Rehearsal 3 runs the same command on its own backup and records the row count, then deletes the
  rehearsal file (Member question 2).
- FR-4. **Full acceptance.** On the candidate commit, run every member's
  `acceptance-pairs.json` with the kit of `primary_parity_acceptance_20261011` on one matched pair of
  copies. Each check passes, or the owner records a decision for it. Then the owner does the look check
  of the full report (decision Q-03). Record the result in
  `measure/tracks/primary_parity_rehearsal3_20261011/acceptance.md`.
- FR-5. **Freeze.** The commit that passes FR-4 becomes the frozen commit of the Primary build inputs
  (the paths of R3). Record it in the command sheet. A change to these paths after the freeze needs a
  new rehearsal.
- FR-6. **Rehearsal 3.** Run the steps of rehearsal 2 with the changes of FR-2, and record them in
  `measure/tracks/primary_parity_rehearsal3_20261011/rehearsal-3-<yyyymmdd>.md`:
  - R1 backup `Backup_Primary_<yyyymmdd>-r3.sql.gz`; R1b the contact export test (FR-3).
  - R2 drop and create `primary_v2` (owner).
  - R3 build context of the frozen commit.
  - R4 ETL in Cloud Build with the member changes (stories); the Tutor read check must still give
    `MATCH`; the student sample 5 of 5. R4b the catalogue and guide imports, as the class books member
    defines them.
  - R5 `after-etl.sh rehearsal3` (owner).
  - R6 the image with no traffic, tag `rehearsal3`; record the image digest.
  - R7 the browser check at the tag URL with `scripts/primary-parity/cutover-check.mjs`. It also
    checks: a teacher assigns a class book and opens a lesson of it; a student opens a story chapter;
    a staff user opens a student page in the view mode, and an action saves nothing; a migrated
    student with a lesson in progress resumes at the right task; an old game URL redirects to its
    cartridge; the PWA manifest and the worker file return 200. Then the five public files (update the
    list if the cleanup member changes the asset paths).
  - R8 the local copy for graph and Workbooks; tell both sessions.
  - R9 the timings.
- FR-7. **New command sheet.** Write `measure/tracks/primary_parity_rehearsal3_20261011/cutover-commands.md`
  from `cutover-commands-20261011.md`, with these changes:
  1. C2 is a check only: the trigger already prints `True`, and the five jobs show `PAUSED`.
  2. C4b: the contact export of FR-3 from the final backup.
  3. C5: `master` already has the merge of 2026-10-11 (`0a29d574e`). The next step is a new merge of
     `primary-parity-integration` into `master` (owner), after a `git merge-tree` check with no
     conflict. The master push starts a www deploy again.
  4. C7: the context file of the new frozen commit; the gate checks `cloudbuild-etl.yaml` against
     that commit and the `latest` version of `PRIMARY_V2_DATABASE_URL`.
  5. C7b: the catalogue and guide imports.
  6. C8: a new label (for example `cutover2`), or move the old files of G-4 away first.
  7. C9: the rehearsal 3 image digest. The tag `cutover` is on `00130-daq` (G-3): use a new tag name,
     or remove the old tag first; decide with a read-only `gcloud run services describe`.
  8. C10: a new `NEW_PASSWORDS_OUT` file (G-4), the new tag URL as `BASE`, and the new checks of R7.
  9. C13: the owner also opens the app on a phone that has the legacy app installed, and checks that
     the new worker replaces the old one (STU-13).
  10. A check before C9 that the rehearsal 3 image still exists (G-9).
- FR-8. **Cutover spec.** Update `docs/deployment/primary-cutover-migration-spec.md` (version 1.11):
  §8 and §9 with the new steps of FR-6 and FR-7, §10 with the new go/no-go items of R7 and the contact
  export, and §11 with the date of FR-9. Add a row to the revision history.
- FR-9. **Cutover date.** After rehearsal 3 passes, the owner sets the cutover date (shared decision
  Q-02). Record it in the command sheet, in the cutover spec §11, and in the set overview.

## Non-Functional Requirements

- NFR-1. The agent runs no step that reads a database password and no traffic change. The owner runs
  R2, R5, C6, C8, and the C11 go, as in rehearsal 2.
- NFR-2. One heavy job at a time on this machine. The ETL and the image build run in Cloud Build. The
  full acceptance runs one app at a time (kit runbook).
- NFR-3. No password, database URL, contact message, or real name goes into the repository. The
  repository gets counts, times, commits, and image digests only.
- NFR-4. Tell the peer sessions (graph, Workbooks, Forge, PR) before R1 and after R8, and tell the
  monorepo session before any write to `primary-parity-integration`.
- NFR-5. ASD-STE100 for the records and the command sheet.

## Acceptance Criteria

- AC-1. `rehearsal-3-changes.md` lists every member and the public pages, each with its changes or
  "none".
- AC-2. The full side-by-side report on the frozen commit has a result for every check of every
  member. Each failed check has an owner decision. The owner's look check passed.
- AC-3. Rehearsal 3 passes on the frozen commit: the ETL reconciliation has no unexplained skip; the
  Tutor read check gives `MATCH`; the student sample is 5 of 5; the catalogue import gives the book
  counts of the class books member; the browser check at the `rehearsal3` tag URL passes every check
  of R7, as the teacher, the admin, a student, and a staff user in the view mode.
- AC-4. The contact export test gives a CSV whose row count equals `select count(*) from
  contact_messages` on the same copy, and no cell of the CSV starts with `=`, `+`, `-`, or `@`.
- AC-5. The new command sheet has the ten changes of FR-7, and each step names who runs it.
- AC-6. The cutover spec has version 1.11 with the new steps, and §11 has the date that the owner set.

## Out of Scope

- The cutover itself (a new run of the migration track with the new command sheet).
- Content writes into the new database (the Workbooks session owns CNT-01).
- The fixes of the members. If the full acceptance finds a defect, the owning member fixes it, and
  FR-4 runs again.
- The rows of "Later work" in the set overview.
- The Tutor switch to the new database (Tutor team, first week after the cutover).

## Member Questions

1. **Calendar.** The cutover spec §11 gives Oct 20 as the last cutover date and a freeze from Oct 22,
   and says that a missed gate keeps legacy for semester 2 (next window: the March 2027 break). Does
   that rule still hold, or does the date of FR-9 replace it?
2. **Contact export timing.** Default: one export from the final backup of the cutover. Does the sales
   team need the messages earlier? Then a first export from the C4 backup of 2026-10-11, and a second
   export of the newer rows at the cutover.
3. **Old tag.** Remove the tag `cutover` from revision `00130-daq` now (the tag URL serves the build
   of 2026-10-11 on `primary_v2`), or at the next C9?
