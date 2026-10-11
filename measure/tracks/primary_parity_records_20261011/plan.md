# Plan — Correct the parity records of the stopped cutover

Documentation only. Work on `primary-parity-integration` in the integration worktree. Tell the
monorepo session before the first write (NFR-5). Commit subjects use
`docs(primary): <subject> (track_id: primary_parity_records_20261011)`; the header and each body line
have 100 characters or less.

The four phases follow the Classic order. For this documentation track, the "contract" is the list of
corrections with evidence, and the "tests" are the checks of the records.

## Phase 1: Contract — the list of corrections

- [ ] Task: Check the facts again, read only
    - [ ] Run the commands of spec E-1 in both repositories and record the counts in `corrections.md`
    - [ ] Run `gcloud run services describe primary-advantage-app --project=primary-advantage --region=asia-southeast1 --format="yaml(status.traffic)"` and record that `primary-advantage-app-00125-9wd` has 100%
    - [ ] Run `git status --short` for `cutover-result-20261011.md` and record whether the section of E-3 is still uncommitted
- [ ] Task: Write `measure/tracks/primary_parity_records_20261011/corrections.md`
    - [ ] Copy Table A of the spec into the file, one row for each correction
    - [ ] Check each `file:line` at the integration HEAD and at legacy `bfea121`; correct a line that moved
    - [ ] Add the legacy page, the new page, and the role to each row (spec FR-2)
- [ ] Task: Write `measure/tracks/primary_parity_records_20261011/triage-decisions.md` (spec FR-8)
    - [ ] Write the location of the source files: path, file names, and the `_saved_at` value
    - [ ] Write one row for each of the 73 triage rows: ID, area, feature, status, choice, timing, owner member
    - [ ] Apply the follow-up decisions to STU-09, STU-21, ADM-11, SYS-04, TCH-07, and STU-14, and say so in each row
    - [ ] Search the file for words of the free-text notes, and remove any copy
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract — the list of corrections' (Protocol in workflow.md)

## Phase 2: Test — checks for the records

- [ ] Task: List the tests that read `measure/lessons-learned.md`
    - [ ] Run `grep -rln "lessons-learned.md" --include=*.test.ts packages apps measure`
    - [ ] For each test, record the assertion (tag, words, or line limit) in this plan under "Lessons-learned checks"
- [ ] Task: Record the red state of the lessons-learned checks
    - [ ] Run `CI=true pnpm --filter @reading-advantage/ai test -- phase-10-closeout` and record the failure of the 50-line limit
    - [ ] Run each other test of the list, one package at a time (machine limit), and record the result
- [ ] Task: Write the record checks as commands in this plan under "Record checks"
    - [ ] A search for "removed" in `docs/primary-whats-moved.md`: each hit names an owner decision and a date
    - [ ] A search for "does not indicate a migration failure" in the migration track folder: no hit
    - [ ] A search for "M4 (after the cutover)" in `measure/` and `docs/`: no hit
- [ ] Task: Measure - User Manual Verification 'Phase 2: Test — checks for the records' (Protocol in workflow.md)

## Phase 3: Implement — edit the records

- [ ] Task: Correct `docs/primary-whats-moved.md` (spec FR-1, FR-2)
    - [ ] Change line 6 and the mark definitions of line 8; add the marks "reduced" and "missing" and the rule of FR-5
    - [ ] Correct each row of `corrections.md`; split the system row of line 91 into three rows
    - [ ] Add the staff note of STU-01 to "How a student gets around"
- [ ] Task: Correct the cutover record (spec FR-3)
    - [ ] Tell the monorepo session that this task replaces its uncommitted section
    - [ ] Replace the section "Owner login and existing limitation" in `measure/tracks/primary_legacy_data_migration_20261004/cutover-result-20261011.md` with "Result: stopped after C10" and the six facts
    - [ ] Change the status line, and mark the items of "Remaining checks" that did not run
- [ ] Task: Update the migration track status (spec FR-4)
    - [ ] Change `measure/tracks/primary_legacy_data_migration_20261004/plan.md:39` to `[b]` with the reason and the set link
    - [ ] Add the status line at the top of `cutover-commands-20261011.md`
    - [ ] Update `updated_at` and `deviation_notes` in the track `metadata.json`
- [ ] Task: Move M4 to the cleanup member (spec FR-7)
    - [ ] Change M4 in `measure/tracks/legacy_games_removal_20261006/spec.md`
    - [ ] Change Phase 3 of `measure/tracks/legacy_games_removal_20261006/plan.md` to M3 only, with one line for the new owner of M4
    - [ ] Change `docs/primary-games-integration.md:88-90`
    - [ ] Change the M4 note of the games removal entry in `measure/tracks.md`
- [ ] Task: Add the behavior-evidence rule (spec FR-5, FR-6)
    - [ ] Add rule 10 and one dated status line to `measure/primary-tutor-parity-program.md`
    - [ ] Condense `measure/lessons-learned.md` to 49 lines or less; keep every entry of "Lessons-learned checks"
    - [ ] Add the entry `- (2026-10-11, primary_parity_records_20261011) ...` under "Planning Improvements"
    - [ ] Count the lines with `wc -l`: 50 or less
- [ ] Task: Tell the peer sessions
    - [ ] Tell the PR session that the marks of `docs/primary-whats-moved.md` changed (the manual and video writers use it)
    - [ ] Tell the monorepo session the commits of this phase
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement — edit the records' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Run the checks
    - [ ] Run each test of "Lessons-learned checks", one package at a time: all pass
    - [ ] Run each command of "Record checks": each gives the expected result
- [ ] Task: Run the Measure scripts, one at a time
    - [ ] Run `bash measure/generate.sh` and stage the files that it changes
    - [ ] Run `bash measure/doctor.sh`; correct each failure that names a file of this track
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)

## Lessons-learned checks

(Phase 2 fills this list.)

## Record checks

(Phase 2 fills this list.)
