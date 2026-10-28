# Plan — Rehearsal 3 and the command sheet for the next Primary cutover

Owner steps stay with the owner (spec NFR-1). Commit subjects use
`docs(primary): <subject> (track_id: primary_parity_rehearsal3_20261011)`, or `chore(primary)` for
the browser check script; the header and each body line have 100 characters or less. Tell the
monorepo session before each write to `primary-parity-integration`.

## Phase 1: Contract — the change list, the gate, and the command sheet

- [x] Task: Check the start gate (spec FR-1) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Check the registry entry of each member of the "Depends on" line: `[x]` or archived (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Check that `primary/public-pages` is merged into integration (`git merge-base --is-ancestor`) — checked 2026-10-12: `c7228ab74` is NOT an ancestor of the integration HEAD; merge pending (recorded in `rehearsal-3-changes.md` §0, f2bdea453)
    - [x] Ask the Workbooks session for the CNT-01 report; record the copy name, the package count, and the verify result (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Record the gate result in `measure/tracks/primary_parity_rehearsal3_20261011/rehearsal-3-changes.md` — §0, gate not passed yet (f2bdea453)
- [x] Task: Write the change list (spec FR-2, f2bdea453)
    - [x] Read the spec, the plan, and `runbook-changes.md` of each member and of the public pages — glob returns 2 files (class_books, qr_path); pwa keeps `runbook-checks.md`; member effects read from specs, plans, and behavior contracts
    - [x] Write one section for each of them in `rehearsal-3-changes.md` with the fields of FR-2, or "none" — §§1-3
    - [x] Check the highest file in `packages/db/drizzle/` and the `--required-migration` values of `apps/primary-advantage/cloudbuild.yaml` and `cloudbuild-etl.yaml`: they agree — `0073_primary_lesson_attempts` in all three places (§2.1)
    - [x] Check each `DROPPED_TABLES` line of `packages/db/src/migrations-data/primary-legacy-import.ts` against the decisions (stories, `contact_messages`, the AI configuration tables); list a wrong reason for its owner — no wrong reason found (§3 note)
- [x] Task: Write the draft command sheet (spec FR-7, f2bdea453)
    - [x] Copy `measure/tracks/primary_legacy_data_migration_20261004/cutover-commands-20261011.md` to `measure/tracks/primary_parity_rehearsal3_20261011/cutover-commands.md` — base unchanged, delta section marks the rehearsal 3 steps
    - [x] Write the rehearsal 3 table (R1 to R9 with R1b and R4b) and the cutover table with the ten changes of FR-7 — delta table covers R1-R9, C2, C4b, C5, C7, C7b, C8, C9, C10, C13
    - [x] Write the export SQL of FR-3 (columns, order, the quote rule) as one `psql \copy` command — in `cutover-commands.md`
    - [x] Run `gcloud run services describe primary-advantage-app --project=primary-advantage --region=asia-southeast1 --format="yaml(status.traffic)"` (read only) and choose the tag rule of C9 — 2026-10-12: `rehearsal3` free; `cutover` taken by `00130-daq`, so the next cutover needs a new tag or a tag removal (owner decision)
- [x] Task: Write the new go/no-go items — `rehearsal-3-changes.md` §5 (f2bdea453)
    - [x] List the items of FR-6 R7 and the contact export for §10 in `rehearsal-3-changes.md`
- [x] Task: Measure - User Manual Verification 'Phase 1: Contract — the change list, the gate, and the command sheet' (Protocol in workflow.md) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)

## Phase 2: Test — local runs before the rehearsal

- [x] Task: Complete the browser check (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Check that `scripts/primary-parity/cutover-check.mjs` has the member blocks (class book and lesson, story chapter, staff student view); add a missing block from the member's spec (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Add the blocks of R7 that no member added: the lesson resume of a migrated student, an old game URL, the PWA manifest and worker files (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Run it against a local production build of the candidate commit (`next start` on port 3005) on a clone of the kit copy, and record each check (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Run the ETL on a local matched pair (heavy job, alone) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Take a new backup (as R1, with a new name) and make a matched pair from it with the kit runbook (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Run the ETL twice into the new copy; the counts are the same on both runs; record the stories counts (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Run the catalogue and guide imports; record the book and lesson counts (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Run `tutor-read-check` and `student-sample-check`: `MATCH` and 5 of 5 (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Test the contact export (spec FR-3, AC-4) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Run the export command on the local legacy copy into `~/Desktop/primary-cutover-inputs/` (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Compare the row count with `select count(*) from contact_messages`; search the file for a cell that starts with `=`, `+`, `-`, or `@` (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Record the count; delete the test file (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Measure - User Manual Verification 'Phase 2: Test — local runs before the rehearsal' (Protocol in workflow.md) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)

## Phase 3: Implement — full acceptance, freeze, and rehearsal 3

- [x] Task: Run the full side-by-side acceptance on the candidate commit (spec FR-4) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Join the `acceptance-pairs.json` files of all members into one run (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Capture the legacy side; stop the legacy server; build the candidate commit; capture the new side; stop the server (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Write the report; record each check in `measure/tracks/primary_parity_rehearsal3_20261011/acceptance.md` (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Send each failed check to its member; run the changed pairs again after the fix (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Do the owner's look check of the full report (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Send the report to the owner; record the answer and each owner decision in `acceptance.md` (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Freeze the build inputs (spec FR-5) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Record the frozen commit in `cutover-commands.md` (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Make the build context with `git archive` and copy it to `gs://primary-advantage_cloudbuild/source/` (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Run rehearsal 3 (spec FR-6) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Tell the peer sessions before R1 (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] R1 backup and R1b contact export test (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] R2 (owner): drop and create `primary_v2` (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] R4 ETL in Cloud Build; R4b catalogue and guide imports (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] R5 (owner): `after-etl.sh rehearsal3` (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] R6 image with no traffic, tag `rehearsal3`; record the digest (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] R7 browser check at the tag URL and the public files (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] R8 local copy for graph and Workbooks; tell both sessions (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Write the rehearsal record (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Write `measure/tracks/primary_parity_rehearsal3_20261011/rehearsal-3-<yyyymmdd>.md` with the steps, the results, the times, and the findings (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Write the image digest of R6 into the C9 step of `cutover-commands.md` (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Get the cutover date (spec FR-9) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Ask the owner for the date after rehearsal 3 passes, and the answers to the member questions (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Record the date in `cutover-commands.md` and in the set overview (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Measure - User Manual Verification 'Phase 3: Implement — full acceptance, freeze, and rehearsal 3' (Protocol in workflow.md) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)

## Phase 4: Generate Docs & Doctor

- [x] Task: Update the cutover spec (spec FR-8) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Write version 1.11 of `docs/deployment/primary-cutover-migration-spec.md`: §8, §9, §10, §11, and the revision history (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Add a status line to `measure/primary-tutor-parity-program.md` with the rehearsal 3 result and the date (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Run the Measure scripts, one at a time (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Run `bash measure/generate.sh` and stage the files that it changes (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Run `bash measure/doctor.sh`; correct each failure that names a file of this track (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)

## Phase: Review Fixes 2026-10-13

- [x] Task: M-3 C13 worker check corrected in `cutover-commands.md` 2d2a132c1
- [x] Task: M-2 change list: lesson-attempts ETL row, Dockerfile step, image-layer check, 404 check, browser-check block table, story counts, AI note; `umask 077` before the contact export 7be5052b3

## Closeout (2026-10-26)

Daniel's decision D2 closed this track on 2026-10-26.
The cutover is live since 2026-10-20. Evidence: `measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md` and the master merge `beb904102`.
The remaining tasks closed with the decision. No new work ran.