# Specification: Storytime at-home release (weeks 1 to 7 in the app)

**Track ID:** `storytime_at_home_release_20261106`
**Type:** chore (classic FR list with acceptance checks)
**Status:** active. Opened 2026-11-06.
**Author model:** claude-code/claude-sonnet-5-5
**Parent track:** [storytime_app_rebuild_20261025](../storytime_app_rebuild_20261025/) (spec: [spec.md](../storytime_app_rebuild_20261025/spec.md), plan: [plan.md](../storytime_app_rebuild_20261025/plan.md)). The parent spec stays the source. This spec points to its sections and does not copy them.
**Owner chain:** Daniel (owner, content approval, deploy word) → Monorepo orchestrator (track owner) → PM orchestrator (hand-offs to Workbooks).
**Plan:** [plan.md](./plan.md)
**Depends on:** the parent Phase 3 heading carries its checkpoint (the parent Phase 3 receiver gate pins `apps/storytime/content` at `67be5603` during its review). Red and Green of Phase 1 start after that checkpoint.

Decision: PM, 2026-11-05. Tasks 3.10 and 3.11 of the parent plan move to this track. The parent Phase 3 checkpoint is written after its reviews and its phase acceptance.

## 1. Purpose

The at-home release of 2026-11-20 needs weeks 1 to 7 in the app. The app receives the Workbooks week packages of commit `82f88853`. Daniel approves the content on 2026-11-16. The deploy follows on his word. The architecture, the app contract, the readiness gate, and the hard gates come from the parent spec. Parent spec sections 1 (architecture), 5 (hard gates), and 6 (non-functional rules) apply here without change.

## 2. Source of Phase 1 (PM hand-off, 2026-11-06)

The PM hand-off of 2026-11-06, quoted exactly:

```
PM → Monorepo. Hand-off: the Storytime week packages, from Workbooks commit 82f88853.
What: import 7 folders into the Storytime app. They use the same contract as the accepted week 1 package.
- ~/Desktop/handoff/w01-storytime-app-package-r2 (45 files). It replaces the first w01 folder. Its MANIFEST.txt lists the 7 changed files: 5 reader pictures (the nest and nut fixes), pictures.sha256, and w01.json (new color-own-book teacher lines).
- ~/Desktop/handoff/w02-storytime-app-package (44), w03 (43), w04 (39), w05 (45), w06 (42), w07 (43). Their meta.status is draft.
PM check: sha256sum -c of each MANIFEST.txt is OK. Each week file is byte-equal to git show 82f88853:content/storytime/l2/w<nn>.json.
Why: the at-home release (11-20) needs weeks 1 to 7 in the app. w01 r2 also fixes the live week 1 pictures.
Done when:
1. Each folder is imported after a sha256 check. The app tests pass.
2. Weeks 2 to 7 stay draft and do not show as published until Daniel's approvals on 11-16.
3. w01 r2 sits in a local commit, ready for his deploy word.
4. You report the commit and the test tail.
Date needed: 2026-11-16.
Order: Storytime P1, right after the current Phase 3 Green r2 turn. Heavy steps go through heavy-run (p1), with server and client in one job. No push, no deploy.
```

Facts that this spec adds, read on 2026-11-06 (read-only):

- The full id of the commit `82f88853` in the Workbooks repository is `82f88853615f2925d8f1c12b4571790305224178`.
- The current pin of `apps/storytime/content` is `67be5603e0410f21491a006b8e9d12f3f9dd1bfc` (`apps/storytime/content/source.json`).
- The Workbooks diff `67be5603..82f88853` changes `content/storytime/l2/w01.json` to `w08.json`. The hand-off holds no w08 folder. The w08 change is 8 lines.
- The receiver (`apps/storytime/scripts/receive-weeks.ts`, runbook `docs/runbooks/storytime-app-week-sync.md`) writes only week files and `source.json`. A run at a new commit must cover every file that `source.json` lists (runbook rule 4), so the run covers weeks 1 to 8.
- The receiver does not copy media. Media stay in the hand-off folders. They go to the production bucket with a deploy on Daniel's word (parent spec FR-4).

## 3. Functional requirements

Each acceptance check (AC) names its evidence class: **automated**, **person-checked**, or **owner-passed** (parent spec section 4).

### FR-1 Receive the week packages (Phase 1)

- Each of the 7 folders passes `sha256sum -c MANIFEST.txt` before any copy. A broken manifest stops the import and goes to the PM.
- w01 r2 replaces w01. It goes into its own commit, so it can ship alone on Daniel's deploy word.
- w02 to w07 enter with `meta.status` `draft`. The receiver never changes `meta.status` or `approval` (parent spec FR-4).
- The receiver runs at `82f88853615f2925d8f1c12b4571790305224178` for weeks 1 to 8, with the existing command and no new tool. The receiver gate of the parent moves to this pin.
- Each week file in `apps/storytime/content/l2/` equals `git show 82f88853:content/storytime/l2/w<nn>.json` byte for byte. The check reads the Workbooks repository only. No command writes in the Workbooks repository.
- w02 to w07 do not show as published. The readiness gate (parent spec FR-5, AC-5.5) keeps them at 404. w01 stays ready.
- No push and no deploy.

Acceptance:

- AC-1.1 (automated) `sha256sum -c MANIFEST.txt` exits 0 in each of the 7 folders. The run records `folders_checked=7`.
- AC-1.2 (automated) For each of weeks 1 to 8, the written week equals the `git show 82f88853:…` output. The run records `weeks_equal=8`. For w01 to w07, the file also equals the hand-off file (`weeks_equal_handoff=7`).
- AC-1.3 (automated) A test reads the shipped w02 to w07. Each has `meta.status` `draft`, and `isWeekReady` is false for each. The test records `weeks_checked=6`.
- AC-1.4 (automated) A test reads the shipped w01. It has `meta.status` `published`, and `isWeekReady` is true. It also holds the new color-own-book teacher lines of r2.
- AC-1.5 (automated) `source.json` records the commit `82f88853615f2925d8f1c12b4571790305224178` and lists weeks 1 to 8. A second receiver run at this commit makes no difference (`git diff --exit-code apps/storytime/content` exits 0).
- AC-1.6 (automated) The targeted app tests of the parent strategy (the phase 2 and phase 3 files that read shipped weeks, and the files that name the pin) exit 0 at the new pin. `tsc --noEmit` in `apps/storytime` exits 0.
- AC-1.7 (automated) The commit of w01 r2 holds `apps/storytime/content/l2/w01.json` only, with the tests that need it. The targeted tests exit 0 at that commit alone.

### FR-2 The approved A-42 pin (Phase 2)

This is the task 3.10 of the parent. The text and the exception note come from the parent plan (lines 261, 263, 743, and 778 at the move). The rule of the parent spec FR-13 applies: AC-13.1 at the approved pin.

- Daniel checks the content on 2026-11-16. The approved weeks arrive as a new Workbooks pin through the PM.
- The target is 2026-11-17 to 2026-11-19.

Acceptance:

- AC-2.1 (automated) AC-13.1 of the parent spec: the typed read schemas parse the shipped weeks `l2/w01` to `l2/w08` at the approved pin. Tests load the shipped files.

### FR-3 The at-home deploy (Phase 3)

This is the task 3.11 of the parent, with amendment R-1 (parent plan line 267: the at-home deploy moves out of task 6.3 into the parent task 3.11; task 6.3 keeps the teacher-app deploy).

- The deploy is Daniel's gate (parent spec section 5). The target is 2026-11-20. The marker is `[b] deferred:daniel`.
- The deploy ships the exact passed commit to `storytime-app` with no traffic, by the runbook `docs/runbooks/storytime-deploy.md`.
- w01 r2 ships only on Daniel's deploy word.
- The production service has no `STORYTIME_SHOW_DRAFT_MEDIA` (parent spec AC-5.5).

Acceptance:

- AC-3.1 (owner-passed) Daniel gives the deploy word. The record names the revision and the word.
- AC-3.2 (automated, after the deploy word) The tagged URL answers 200 for the ready weeks. The media files in the production bucket match the hand-off files, file by file (parent spec rule 12.4).
- AC-3.3 (automated, after the deploy word) The environment of the deployed revision has no `STORYTIME_SHOW_DRAFT_MEDIA`. The record names the check and the result.
- AC-3.4 (automated, after the deploy word) AC-2.3 of the parent spec: each printed URL of the published weeks answers 200 on the live domain, after Daniel moves the traffic.

## 4. Constraints

- Hard gates stay with Daniel: paid generation, deploys, deletions, and public dates. A task at a gate gets `[b] deferred:daniel`.
- Never write in another repository. The Workbooks repository is read-only here.
- Do not add a hash, a checksum field, or a provenance file (AGENTS.md hashing policy). The `sha256sum -c` run is the check that the hand-off names. Git commit identity is the provenance.
- Stage named paths only. Other sessions commit on master. Never run `git add -A` or `git add .`.
- Heavy steps (vitest, `tsc`, eslint, build) run through `heavy-run.sh`, one job at a time, with server and client in one job. Vitest uses `--maxWorkers=1` and targeted files.
- Commit headers and body lines are 100 characters or less, with the `track_id`.
- No push. No deploy.

## 5. Out of scope

- A change to any app code or any contract (parent Phase 3 owns them). If the receiver or a test finds a contract fault, the task stops and reports it to the orchestrator.
- The loops (A-42) display work: tasks 3.9 and 4.6 of the parent.
- The teacher app deploy (task 6.3 of the parent).
- The media upload to the bucket and the traffic move before Daniel's word.
- Week 8 content work. The receiver writes w08 because the run covers the whole set.

## 6. Open questions

| # | Question | Default until the PM answers |
|---|---|---|
| R1 | The hand-off has no w08 folder, but the receiver rule needs weeks 1 to 8 at a new commit, and `82f88853` changes w08 by 8 lines. | Run weeks 1 to 8. Check w08 byte-equal to `git show`. w08 stays draft and not ready. Report the w08 diff to the PM. |
| R2 | The receiver writes `source.json` at the new pin, and it covers all weeks. How does w01 r2 ship alone? | Two commits. Commit A holds `w01.json` only. Commit B holds `w02.json` to `w08.json` and `source.json`. |
| R3 | Do the media of the 7 folders stay in the hand-off folders until the deploy? | Yes. The review copy reads them through `STORYTIME_MEDIA_BASE`. The first w01 folder is superseded by r2. |
