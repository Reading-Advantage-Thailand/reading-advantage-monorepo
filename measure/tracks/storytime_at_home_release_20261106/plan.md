# Implementation Plan: Storytime at-home release (weeks 1 to 7 in the app)

> **Track ID:** `storytime_at_home_release_20261106` · **Spec:** [spec.md](./spec.md) · **Parent plan:** [storytime_app_rebuild_20261025/plan.md](../storytime_app_rebuild_20261025/plan.md)
> **Release goal:** the at-home release of 2026-11-20 shows weeks 1 to 7 in the app (PM decision, 2026-11-05).
> **Dates:** local commits of Phase 1 by 2026-11-14. The PM needs them on 2026-11-16. Daniel's content check is on 2026-11-16. The deploy target is 2026-11-20.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b] … deferred:<owner>` at a human gate. A task in phase N+1 starts only after the heading of phase N has its checkpoint (measure-guard). Phase 2 and Phase 3 also wait for the dates and gates that their tasks name.
- An `[x]` note names the commit and the evidence class: automated, person-checked, or owner-passed (parent spec FR-11, rule 7.1).
- Hard gates stay with Daniel: paid generation, deploys, deletions, and public dates. No push and no deploy without his word.
- Each task follows `measure/workflow.md`: tests first, then code, then one commit with `(track_id: storytime_at_home_release_20261106)`. The commit header is 100 characters or less.
- Stage named paths only. Other sessions commit on master. Never run `git add -A` or `git add .`.
- Heavy steps run through `bash ~/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`, one job at a time, with server and client in one job. Vitest uses `--maxWorkers=1` and targeted files.
- Paths start at the monorepo root. This track never writes in the Workbooks repository. Read-only `git -C ~/Desktop/Workbooks show` and `git -C ~/Desktop/Workbooks diff` are allowed.
- No new hash, checksum field, or provenance file (AGENTS.md hashing policy). The `sha256sum -c` run named by the PM hand-off is the only hash step.
- At the end of each phase, run the phase check and append `[checkpoint: <sha>]` to the phase heading.

## Phase 1: Receive the Workbooks 82f88853 week packages

Dependency: Red and Green of Phase 1 start only after the heading of Phase 3 in the parent plan carries its checkpoint. The parent Phase 3 receiver gate pins `apps/storytime/content` at `67be5603` during its review. This phase moves that pin to `82f88853`.

Tools: the existing receiver `apps/storytime/scripts/receive-weeks.ts` and the runbook `docs/runbooks/storytime-app-week-sync.md`. The existing tests of the parent strategy (`measure/tracks/storytime_app_rebuild_20261025/test-strategy.md`, sections P2 and P3) apply. This phase builds no new tool.

Pin values: new pin `82f88853615f2925d8f1c12b4571790305224178`. Current pin `67be5603e0410f21491a006b8e9d12f3f9dd1bfc`.

Source folders (all under `~/Desktop/handoff/`): `w01-storytime-app-package-r2` (45 files), `w02-storytime-app-package` (44), `w03-storytime-app-package` (43), `w04-storytime-app-package` (39), `w05-storytime-app-package` (45), `w06-storytime-app-package` (42), `w07-storytime-app-package` (43).

- [ ] 1.1 Start gate. Check that the parent Phase 3 heading carries `[checkpoint: <sha>]`. Check that the 7 folders exist and that each holds `MANIFEST.txt` with the line `workbooks-commit: 82f88853`. Check that `git -C ~/Desktop/Workbooks rev-parse 82f88853` prints the full pin above. Record `git rev-parse HEAD` as the phase base. Any failed check stops the phase and goes to the orchestrator. Target: 2026-11-09 or the day after the parent checkpoint. Evidence class: automated (command output in the plan note).
- [ ] 1.2 Hand-off check. In each of the 7 folders, run `sha256sum -c MANIFEST.txt`. A line of `MANIFEST.txt` that is not a file entry (a metadata line) is a warning and not a failure, as in the parent task 3.8 take. A broken file entry stops the import and goes to the PM. Test: AC-1.1. Record `folders_checked=7` and the exit code of each run. The run copies nothing. Target: 2026-11-10.
- [ ] 1.3 Red tests. Write the tests first and run them red at the old pin. Files in `apps/storytime/__tests__/`:
  - `release-receipt-pin.test.ts` (AC-1.2, AC-1.5): `source.json` records the new pin and lists weeks 1 to 8; the test counts `weeks_parsed=8`; it asserts that the input set is not empty before it checks a property of each week (anti-pattern A4).
  - `release-weeks-readiness.test.ts` (AC-1.3, AC-1.4): w02 to w08 have `meta.status` `draft` and `isWeekReady` false, so each answers 404 (`weeks_checked=7`, with the input set asserted not empty before each property check); w01 has `meta.status` `published` and `isWeekReady` true; w01 holds the color-own-book teacher lines of r2. The w08 check is a named case, because the receipt writes w08 at the new pin (spec review F2).
  - Red lists each existing test that names the pin, a count of media, or a count of missing pictures (parent strategy row F7), for example `phase3-loop-contract.test.ts` and `phase3-media-coverage.test.ts`. Green changes those expectations in the same commit as the new pin, and each change has one line of reason in the evidence block.
  - A Red failure is an assertion on the old content. No file fails to load. Target: 2026-11-11.
- [ ] 1.4 Run the receiver at the new pin. Command: `node_modules/.bin/tsx apps/storytime/scripts/receive-weeks.ts --commit 82f88853615f2925d8f1c12b4571790305224178 --weeks 1-8`. The run covers weeks 1 to 8 because the runbook rule 4 needs the whole set at a new commit. Expected exit: 0. The receiver writes `w01.json` to `w08.json` and `source.json`. It never changes `meta.status` or `approval`. Record the receiver output: the number of weeks, the media files, and the missing pictures. Open question R1: w08 comes from the same commit and is not in the hand-off. w01 r2 pictures stay in `~/Desktop/handoff/w01-storytime-app-package-r2/` and are not copied into the repository. Tests: AC-1.2, AC-1.3. Target: 2026-11-12.
- [ ] 1.5 Receipt commit (one commit; spec review F1). Make one commit. Stage named paths only: `apps/storytime/content/l2/w01.json` to `w08.json`, `apps/storytime/content/source.json`, and the test files with the changed pin expectations of task 1.3. w02 to w08 are drafts in the app at the old pin already, and they stay draft, so a deploy of this commit changes only w01 for a user. The commit is ready for Daniel's deploy word. No separate w01 commit exists, because a second receiver run at the new pin rewrites w02 to w08 and `source.json`, and a w01-only commit could not pass the gate of task 1.7. Tests: AC-1.4, AC-1.7. Commit subject: `feat(storytime): receive weeks 1 to 8 at 82f88853 (track_id: storytime_at_home_release_20261106)` (96 characters). Target: 2026-11-13.
- [ ] 1.6 Byte-equal checks (read-only). For each of the weeks 1 to 8, compare `apps/storytime/content/l2/w<nn>.json` with `git -C ~/Desktop/Workbooks show 82f88853615f2925d8f1c12b4571790305224178:content/storytime/l2/w<nn>.json`. For w01 to w07, compare it also with the hand-off file in the folder. Record `weeks_equal=8` and `weeks_equal_handoff=7`. Also compare w08 with the Workbooks diff `67be5603..82f88853` (8 lines) and report it to the PM. No command writes in the Workbooks repository. Test: AC-1.2. Target: 2026-11-13.
- [ ] 1.7 Tests green and the receiver gate. The gate of the parent (receiver at a recorded pin, then `git diff --exit-code apps/storytime/content`) moves to the new pin and binds to the receipt commit of task 1.5. After that commit exists, run the second receiver run at the new pin, then `git diff --exit-code apps/storytime/content`. Expected exit: 0. Run the targeted app tests through one `heavy-run.sh` job: the new files of task 1.3, the 29 files of phase 2 and phase 3 of the parent strategy that read shipped weeks, and the files that name the pin, with `--maxWorkers=1`. Run `tsc --noEmit` in `apps/storytime` and ESLint on the changed TypeScript files, each through `heavy-run.sh`. All of this set exits 0 at the receipt commit. Tests: AC-1.5, AC-1.6, AC-1.7. Target: 2026-11-13.
- [ ] 1.8 Phase check. Run `phase1-quality-gates.sh` of the app (`bash apps/storytime/__tests__/phase1-quality-gates.sh`), the targeted tests, `tsc`, and ESLint. The change-quality review (Review A on the diff of the receipt commit) goes to the review role. The browser gate does not run: no app code, no route, and no media file changes in this phase. The record says so. Report to the PM: the SHA of the receipt commit and the test tail (the last lines of the test output with the file count and the test count). Append `[checkpoint: <sha>]` to this heading after the reviews and the phase acceptance. Target: local commits by 2026-11-14; date needed 2026-11-16.

### Phase 1 notes

- The PM check before the hand-off: `sha256sum -c` of each `MANIFEST.txt` is OK. Each week file is byte-equal to `git show 82f88853:content/storytime/l2/w<nn>.json`. This phase runs both checks again, because a copy is not proof (parent spec FR-4).
- The first w01 folder (`~/Desktop/handoff/w01-storytime-app-package`) is superseded by r2. The MANIFEST of r2 lists the 7 changed files: 5 reader pictures, `pictures.sha256`, and `w01.json`.
- If the tests that read shipped weeks fail at the new pin on a contract fault (for example a new field or a closed enum), the task stops. The orchestrator decides the order: contract first, then the receipt (parent strategy row F14). This track makes no contract change by itself.

## Phase 2: Approved A-42 pin

Amendment A-42 (copied from the parent plan, line 261): tasks 3.8, 3.9, 3.10, and 4.6 come from FR-13. The 11-20 release proof is a print proof (PM decision, 2026-11-03, parent spec FR-13), so the app does not show the loops on 2026-11-20. Task 3.8 closed at the draft pin. Task 3.10 follows task 3.8 and receives the approved weeks (PM decision, 2026-11-03). The latest date for the receipt is 2026-11-19.

Exception to the phase-order rule (copied from the parent plan, line 263, and adapted by the move): the receipt task of this phase does not hold the Phase 3 and Phase 4 checkpoints of the parent. It has the dates 2026-11-17 to 2026-11-19. It runs after the checkpoint of Phase 1 of this track, with its own phase check.

- [ ] 2.1 (old parent task 3.10) Receive the approved A-42 pin: the week files with approval.loops approved after Daniel's content check (by 2026-11-16). Tests: AC-13.1 at the approved pin (`phase3-approved-pin.test.ts`, as the parent strategy names it). Target 2026-11-17 to 2026-11-19.
  - Hand-off of the w01 app package (PM accepted these defaults, 2026-11-03): Workbooks sends the package in a folder under `/home/daniebo/Desktop/handoff/`. The folder holds `MANIFEST.txt` with the line `workbooks-commit: <full sha>`. The media paths are relative to `content/storytime/`. The receiver runs at that commit. The received `w01.json` must equal the hand-off `w01.json` byte for byte. The media come from the folder after the SHA-256 check against `MANIFEST.txt`.
  - Task 3.10 stays open, because the loops approval comes later. (Parent plan line 778.)
  - The approved pin replaces the pin of Phase 1. The receiver gate moves to the approved pin in the same way as in task 1.7.
- [ ] 2.2 Phase check: the Closeout gate of the parent strategy for task 3.10. `phase3-approved-pin.test.ts` and `phase3-loop-contract.test.ts` exit 0. The receiver at the approved pin exits 0. `git diff --exit-code apps/storytime/content` exits 0 after a second receiver run. `phase1-quality-gates.sh` exits 0. Review A on the diff. Append `[checkpoint: <sha>]` to this heading.

## Phase 3: At-home deploy

Amendment R-1 (copied from the parent plan, line 267): the at-home deploy moves out of task 6.3 and into this task. The deploy follows the acceptance of the receipt phases, with target 2026-11-20. Task 6.3 of the parent keeps the teacher-app deploy. No other task number changes.

- [b] 3.1 (old parent task 3.11) At-home deploy: the exact passed commit to `storytime-app` with no traffic. Upload the media to the production bucket and check it file by file. Check the tagged URL. Confirm that `STORYTIME_SHOW_DRAFT_MEDIA` is not set in the production service (`storytime-app`): read the service environment of the deployed revision and record the result. Target: 2026-11-20. deferred:daniel
  - w01 r2 ships only on Daniel's deploy word. It ships with the receipt commit of task 1.5. w02 to w08 stay at 404 until Daniel's approvals of 2026-11-16 and the approved pin of task 2.1 are in the deployed commit.
  - The deploy follows the runbook `docs/runbooks/storytime-deploy.md`. A traffic move is a separate step with Daniel's word. Tests: AC-3.1 to AC-3.4.
