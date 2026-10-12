# Plan — Correct the parity records of the stopped cutover

Documentation only. Work on `primary-parity-integration` in the integration worktree. Tell the
monorepo session before the first write (NFR-5). Commit subjects use
`docs(primary): <subject> (track_id: primary_parity_records_20261011)`; the header and each body line
have 100 characters or less.

The four phases follow the Classic order. For this documentation track, the "contract" is the list of
corrections with evidence, and the "tests" are the checks of the records.

## Phase 1: Contract — the list of corrections [checkpoint: 456c001dd]

- [x] Task: Check the facts again, read only
    - [x] Run the commands of spec E-1 in both repositories and record the counts in `corrections.md`
    - [x] Run `gcloud run services describe primary-advantage-app --project=primary-advantage --region=asia-southeast1 --format="yaml(status.traffic)"` and record that `primary-advantage-app-00125-9wd` has 100%
    - [x] Run `git status --short` for `cutover-result-20261011.md` and record whether the section of E-3 is still uncommitted
- [x] Task: Write `measure/tracks/primary_parity_records_20261011/corrections.md`
    - [x] Copy Table A of the spec into the file, one row for each correction
    - [x] Check each `file:line` at the integration HEAD and at legacy `bfea121`; correct a line that moved
    - [x] Add the legacy page, the new page, and the role to each row (spec FR-2)
- [x] Task: Write `measure/tracks/primary_parity_records_20261011/triage-decisions.md` (spec FR-8)
    - [x] Write the location of the source files: path, file names, and the `_saved_at` value
    - [x] Write one row for each of the 73 triage rows: ID, area, feature, status, choice, timing, owner member
    - [x] Apply the follow-up decisions to STU-09, STU-21, ADM-11, SYS-04, TCH-07, and STU-14, and say so in each row
    - [x] Search the file for words of the free-text notes, and remove any copy
- [x] Task: Measure - User Manual Verification 'Phase 1: Contract — the list of corrections' (Protocol in workflow.md) (look check pending (owner, async))
    - Manual verification steps (no capture; documentation only):
        1. Open `corrections.md`. Check that it has 29 rows and that each row has a legacy page, a new page, and a role.
        2. Open `triage-decisions.md`. Check that it has 73 rows and no free-text note of the owner.
        3. Pick three `file:line` cites. Open each at the integration HEAD or at legacy `bfea121`. Check the cite.
    - Defaults used: none (the spec has no Member Question).
    - Note: the NFR-5 message to the monorepo session is the job of the orchestrator. No write was made to the uncommitted cutover record.

## Phase 2: Test — checks for the records [checkpoint: f327b4b4f]

- [x] Task: List the tests that read `measure/lessons-learned.md`
    - [x] Run `grep -rln "lessons-learned.md" --include=*.test.ts packages apps measure`
    - [x] For each test, record the assertion (tag, words, or line limit) in this plan under "Lessons-learned checks"
- [x] Task: Record the red state of the lessons-learned checks
    - [x] Run `CI=true pnpm --filter @reading-advantage/ai test -- phase-10-closeout` and record the failure of the 50-line limit
    - [x] Run each other test of the list, one package at a time (machine limit), and record the result
- [x] Task: Write the record checks as commands in this plan under "Record checks"
    - [x] A search for "removed" in `docs/primary-whats-moved.md`: each hit names an owner decision and a date
    - [x] A search for "does not indicate a migration failure" in the migration track folder: no hit
    - [x] A search for "M4 (after the cutover)" in `measure/` and `docs/`: no hit
- [x] Task: Measure - User Manual Verification 'Phase 2: Test — checks for the records' (Protocol in workflow.md) (look check pending (owner, async))
    - Manual verification steps (no capture; documentation only):
        1. Open "Lessons-learned checks" below. Check that each of the 6 limit tests and each tag test has a row.
        2. Run each command of "Record checks". Check that the result today matches the "Red now" column.
        3. Run one test of the table, for example `packages/auth` `phase-7-closeout`. Check that it fails on the 50-line limit only.
    - Defaults used: none (the spec has no Member Question).
    - NFR-5: monorepo session approved 2026-10-12 (the orchestrator is the monorepo session). It holds a copy of the uncommitted section of `cutover-result-20261011.md`. Phase 3 replaces that section.

## Phase 3: Implement — edit the records

- [x] Task: Correct `docs/primary-whats-moved.md` (spec FR-1, FR-2)
    - [x] Change line 6 and the mark definitions of line 8; add the marks "reduced" and "missing" and the rule of FR-5
    - [x] Correct each row of `corrections.md`; split the system row of line 91 into three rows
    - [x] Add the staff note of STU-01 to "How a student gets around"
- [x] Task: Correct the cutover record (spec FR-3)
    - [x] Tell the monorepo session that this task replaces its uncommitted section
    - [x] Replace the section "Owner login and existing limitation" in `measure/tracks/primary_legacy_data_migration_20261004/cutover-result-20261011.md` with "Result: stopped after C10" and the six facts
    - [x] Change the status line, and mark the items of "Remaining checks" that did not run
- [x] Task: Update the migration track status (spec FR-4)
    - [x] Change `measure/tracks/primary_legacy_data_migration_20261004/plan.md:39` to `[b]` with the reason and the set link
    - [x] Add the status line at the top of `cutover-commands-20261011.md`
    - [x] Update `updated_at` and `deviation_notes` in the track `metadata.json`
- [x] Task: Move M4 to the cleanup member (spec FR-7)
    - [x] Change M4 in `measure/tracks/legacy_games_removal_20261006/spec.md`
    - [x] Change Phase 3 of `measure/tracks/legacy_games_removal_20261006/plan.md` to M3 only, with one line for the new owner of M4
    - [x] Change `docs/primary-games-integration.md:88-90`
    - [x] Change the M4 note of the games removal entry in `measure/tracks.md`
- [x] Task: Add the behavior-evidence rule (spec FR-5, FR-6)
    - [x] Add rule 10 and one dated status line to `measure/primary-tutor-parity-program.md`
    - [x] Condense `measure/lessons-learned.md` to 49 lines or less; keep every entry of "Lessons-learned checks"
    - [x] Add the entry `- (2026-10-11, primary_parity_records_20261011) ...` under "Planning Improvements"
    - [x] Count the lines with `wc -l`: 50 or less
- [x] Task: Tell the peer sessions
    - [x] Tell the PR session that the marks of `docs/primary-whats-moved.md` changed (the manual and video writers use it)
    - [x] Tell the monorepo session the commits of this phase
- [x] Task: Measure - User Manual Verification 'Phase 3: Implement — edit the records' (Protocol in workflow.md) (look check pending (owner, async))
    - Manual verification steps (no capture; documentation only):
        1. Open `docs/primary-whats-moved.md`. Check that the marks "reduced" and "missing" exist and that each "removed" row names an owner decision with a date.
        2. Open `cutover-result-20261011.md`. Check the status line and the section "Result: stopped after C10" with six facts.
        3. Run `wc -l measure/lessons-learned.md`. Check that the result is 50 or less.
    - Defaults used: none (the spec has no Member Question).
    - Note: "Tell the peer sessions" is the job of the orchestrator (a helper has no peer channel). The report names both messages.
    - Note: the Phase 4 check 5 counts one hit; the status of `Remaining checks` items reads "Did not run".

## Phase 4: Generate Docs & Doctor

- [ ] Task: Run the checks
    - [ ] Run each test of "Lessons-learned checks", one package at a time: all pass
    - [ ] Run each command of "Record checks": each gives the expected result
- [ ] Task: Run the Measure scripts, one at a time
    - [ ] Run `bash measure/generate.sh` and stage the files that it changes
    - [ ] Run `bash measure/doctor.sh`; correct each failure that names a file of this track
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)

## Lessons-learned checks

Search of 2026-10-12: 11 files name `lessons-learned.md`. Four of them only mention it in a comment or
in a regex (`housekeeping-phase7-git-notes.test.ts`, `codecamp-curriculum-fidelity.test.ts`,
`measure/archive/post_24h_audit_remediation_20260612/__tests__/phase6-closeout.test.mjs`). They have
no assertion on the file. The spec E-6 list missed two limit tests (rows 8 and 9 below).

Run commands (one package at a time, from the package folder, `CI=true`):

- `packages/*`: `pnpm exec vitest run src/__tests__/<file>`
- `apps/science-advantage`, rows 6, 7, and 8: `pnpm exec vitest run --config vitest.unit.config.ts <file>`
- `apps/science-advantage`, row 5 (`lib/ci-gates`): `pnpm exec vitest run --config vitest.verification.config.ts <file>`
- The default config of the science app needs a test database, so do not use it.

| # | Test file | Assertion on `lessons-learned.md` | Red now (57 lines) |
|---|---|---|---|
| 1 | `packages/ai/src/__tests__/phase-10-closeout.test.ts` | an entry `(date, ai_adapter_package...)`; on that one line: "mock", "unit test", "snapshot" or "deterministic", "real", "integration", "API key(s)"; `split("\n")` count <= 51 (so `wc -l` <= 50) | 1 of 3 failures is the limit (58 > 51). The other 2 failures are the tech-debt cap |
| 2 | `packages/auth/src/__tests__/phase-7-closeout.test.ts` | entry `(2026-06-06, audit_log_retention_dsar_20260605)` whose body has "privileged", "REVOKE", "append-only", or "advisory"; line count <= 50 | fails on the limit (57 > 50); the tech-debt cap also fails |
| 3 | `packages/webhooks/src/__tests__/phase-7-closeout.test.ts` | entry `(2026-06-12, codecamp_review_ai_consolidation_20260605)` whose body has "adapter" or "DI seam", and one of "OpenRouter", "blast-radius", "preflight"; line count <= 51 | fails on the limit (57 > 51); 3 tech-debt failures also fail |
| 4 | `packages/db/src/__tests__/deploy-gate-contract.test.ts` (lines 470-490) | words "drizzle ... migrator", "strict-<", and `1779120000000` | passes (18 of 18) |
| 5 | `apps/science-advantage/lib/ci-gates/phase-14-closeout.test.ts` (tests 11-13) | words `` `ignoreBuildErrors: true` ``, "type-safety hole", "6 root cause"; line count <= 50 | test 13 fails on the limit (57 > 50). Tests 2-10 fail on tech-debt and are not in this track |
| 6 | `apps/science-advantage/lib/observability/__tests__/phase-10-closeout.test.ts` | text `observability_stack_20260603` and "AsyncLocalStorage + Sentry + OTel is the right observability stack" | passes |
| 7 | `apps/science-advantage/lib/__tests__/housekeeping-phase12-closeout.test.ts` (section 2) | one line with `housekeeping_batch_20260603`, a date 2026-06-03 or later, and "batched housekeeping" or "batched-housekeeping" or "cheaper to review" or "10 small fixes"; line count <= 50 | section 2.2 fails on the limit (57 > 50); 2.1 passes. Section 1 fails on tech-debt |
| 8 | `apps/science-advantage/lib/__tests__/audit-phase2-static-analysis.test.ts` (section 13.3) | line count <= 50 (not in spec E-6) | fails (57 > 50); 13.2 (tech-debt) and 11.6 (graph.db age) also fail |

The tests that fail on `tech-debt.md` or `graph.db` stay red after
this track. `tech-debt.md` has 106 lines and is not in this track. Report this to the orchestrator.

Pass target for Phase 4: rows 1 to 8 pass on every lessons-learned assertion (the limit and the
tags). Keep these 7 entries when Phase 3 condenses the file: `ai_adapter_package`,
`audit_log_retention_dsar_20260605`, `codecamp_review_ai_consolidation_20260605`, the entry with
"drizzle migrator", "strict-<" and `1779120000000` (`db_migration_ledger_20260611`),
`ci_typecheck_alignment_20260603`, `observability_stack_20260603`, `housekeeping_batch_20260603`.
The new entry for this track must stay one line, with the tag `primary_parity_records_20261011`.

## Record checks

Run each command from the repository root. "Red now" is the result on 2026-10-12 before Phase 3.
"Green" is the result that Phase 4 needs.

| # | Command | Red now | Green |
|---|---|---|---|
| 1 | `grep -i "removed" docs/primary-whats-moved.md \| grep -E "^[|]" \| grep -v -E "owner (decision\|follow-up).*2026-10-1[01]" \| wc -l` | 5 | 0 |
| 2 | `grep -rn "does not indicate a migration failure" measure/tracks/primary_legacy_data_migration_20261004/ \| wc -l` | 1 | 0 |
| 3 | `grep -rn "M4 (after the cutover" measure docs --include=*.md --exclude-dir=primary_parity_records_20261011 \| wc -l` | 3 | 0 |
| 4 | `grep -n "M4 (removal) after" measure/tracks.md \| wc -l` | 1 | 0 |
| 5 | `grep -c "Result: stopped after C10" measure/tracks/primary_legacy_data_migration_20261004/cutover-result-20261011.md` | 0 | 1 |
| 6 | `sed -n 39p measure/tracks/primary_legacy_data_migration_20261004/plan.md \| grep -c "^- [[]b]"` | 0 | 1 |
| 7 | `wc -l < measure/lessons-learned.md` | 57 | 50 or less |
| 8 | `grep -c "primary_parity_records_20261011" measure/lessons-learned.md` | 0 | 1 |
| 9 | `grep -c "A route name is not evidence" measure/primary-tutor-parity-program.md` | 0 | 1 |

Notes on the checks:

- Check 1 reads the table rows only (lines that start with `|`). A row that says "removed" must name an
  owner decision or an owner follow-up, with a date of 2026-10-10 or 2026-10-11. In Phase 3, write
  "dropped by plan" (not "removed") for the STU-23 column, and write "to be removed" rows with the
  words "owner follow-up of 2026-10-11". The red count 5 is the rows at lines 24, 59, 92, 93, 103.
- Check 3 had 3 hits: `legacy_games_removal_20261006/spec.md:32`, `plan.md:48`, and
  `docs/primary-games-integration.md:90`. The folder of this track is out of the search because its
  plan and spec quote the old text.
- Check 4 reads the games removal note in `measure/tracks.md` line 38. Phase 3 also writes the new
  owner of M4 there (spec FR-7).
- Check 9: if Phase 3 words the rule differently, change this search to the new words.
- AC-3 also needs the six facts of FR-3 in the cutover record. Phase 4 checks them by reading the
  section, not by a search.

