# Five-Lane Orchestration Handoff

Date: 2026-08-15  
Repository: `/home/daniebo/Desktop/reading-advantage-monorepo`  
Baseline before this document: `e896d9343635bcb9d53f9a469ea6187d8f1ace94` on `master`

## Purpose

This document transfers orchestration of Finance, Marketing, Coding, APK, and Sales.

The previous orchestrator lost trust by reporting process activity as product delivery.
The next orchestrator must prove progress through code, tests, commits, and product checks.

This document does not claim that any lane or application is complete.

## Owner Direction

The owner requires all five lanes to stay active.

- Give each lane a code-bearing task.
- Keep reviews and documentation as support work.
- Do not let support work replace implementation.
- Continue unaffected work when one operation needs external input.
- Validate every blocker against current Git evidence.
- Report product changes separately from tests and documents.

The owner confirms that the EVLGames license is settled.
Do not create another APK license gate.

The owner reports eight rebuilt apps and more than 20 legacy apps.
Do not infer the game inventory from one APK track.
Verify exact inventory through catalogs and host routes before reporting a number.

Finance policy work already exists.
Do not call Finance blocked before reading the accepted THB artifacts and current tests.

Kernel work counts when it directly enables a lane feature.
Record the consuming lane and the exact dependency.

## What Counts as Lane Progress

| Work                                        | Classification             |
| ------------------------------------------- | -------------------------- |
| Production code or application code         | Product progress           |
| A test that defines the next implementation | TDD progress, not delivery |
| A passing implementation test               | Implementation evidence    |
| A manual product check                      | Product verification       |
| A review result                             | Quality evidence           |
| A plan, report, or Git note                 | Audit evidence             |
| Marker cleanup without implementation       | No product progress        |

A lane is active only when an implementation owner has a code-bearing task.
Red work can start the task, but Green implementation must follow.

## Current Five-Lane Snapshot

### Finance

- Track: `company_finance_operations_20260810`.
- The THB policy attestor exists in commit `08acca162`.
- The aligned THB Red contract exists in commit `0fe4bef13`.
- The Red suite has 47 intentional failures from three missing exports.
- The missing exports are `financeThbConversionEvidenceSchema`, `createFinanceThbValuationPreparer`, and `classifyFinanceThbValuationReplay`.
- The Company Identity attestor suite passed 83 tests at the recorded baseline.

Next code-bearing work:

1. Read the accepted THB specification and attestor contract.
2. Confirm that the specification contains each required conversion rule.
3. Implement the three Finance exports through provider-neutral contracts.
4. Make the 47 Red tests Green.
5. Run independent correctness and security reviews on the committed source.

Ask the owner only when a required rule is absent from the accepted artifacts.
Do not repeat an old owner gate without this check.

### Marketing

- Track: `wave5_public_surface_completion_20260628`.
- Phase 3 Group B is Green in commit `ee2d7c238`.
- Group B added strict locale types and rendered translation sentinels.
- Groups A and C remain intentional Red work.
- Group A covers CTA and accessibility copy.
- Group C covers known Thai translation errors.

Next code-bearing work:

1. Externalize the reviewed CTA and accessibility text.
2. Add complete `en`, `th`, and `zh` messages.
3. Correct the reviewed Thai text.
4. Run the focused Phase 3 tests.
5. Open the application and verify each changed route.

Do not reopen accepted Group B work without a new defect.

### Coding

- Track: `durable_job_worker_platform_20260713`.
- Task 8 is Green in commit `b8b0dce71`.
- A fresh PostgreSQL 16 run passed 13 tests.
- The run removed its databases, roles, and container.
- Task 9 remains the next Red backend task.

Next code-bearing work:

1. Activate Task 9.
2. Add idempotency, retry, exhaustion, audit, and replay Red tests.
3. Complete Phase 2 acceptance.
4. Implement Tasks 11 through 14.
5. Keep live PostgreSQL tests isolated and disposable.

Do not treat an internal review label as an external blocker.

### APK

- Recent track: `apk_legacy_traversal_cutover_20260727`.
- Task 1 readiness evidence exists in commit `7e87591d4`.
- The focused readiness suite passed nine tests.
- The commit adds no license blocker.
- Existing rebuilt cartridges and legacy apps remain in the repository.

The traversal track covers these five titles:

- Dragon Rider
- Spellweaver's Run
- Shadow Gate Dungeon
- Labyrinth of the Goblin King
- Griffin Rider's Escape

Next code-bearing work:

1. Close Task 1 against the committed readiness manifest.
2. Freeze each title's accepted asset and mechanic bindings.
3. Write mechanic, layout, and learning Red tests.
4. Build each cartridge through current APK APIs.
5. Run Advantage Games QC after each cartridge.
6. Run Reading and Primary host proofs.

Do not say that rebuilt games do not exist.
Do not use licensing as a reason to stop this work.

### Sales

- Tracks: `sales_advantage_golive_20260701` and `sales_mastery_consumer_20260810`.
- The Sales application is deployed.
- Automated audio privacy evidence exists in commit `7330697b7`.
- Full authenticated `SALES_REP` browser QA remains unverified.
- Recent commits `8fa71b33b` and `6aa7801d0` changed only Measure state.

Next code-bearing work:

1. Continue Sales Mastery code while the rep session is unavailable.
2. Determine whether each Task B root failure is Sales-attributable.
3. Do not let unrelated root debt idle Sales.
4. Start the Phase 2 Red path after lane acceptance.
5. Use a valid Accounts `SALES_REP` session when one is available.
6. Run dashboard, theory, roleplay, quiz, chat, admin, locale, and rate-limit checks.
7. Record actual browser results and sanitized evidence.

The missing session blocks authenticated browser QA only.
It does not block all Sales engineering.

## Manual Product Verification Schedule

Manual checks must start after each user-facing Green slice.
Do not wait for track closeout.

| Lane      | Start the check when                   | Required surface                                            |
| --------- | -------------------------------------- | ----------------------------------------------------------- |
| Marketing | Each route change passes focused tests | Localized routes, links, layout, and mobile view            |
| APK       | Each cartridge passes unit tests       | Advantage Games QC, then Reading and Primary hosts          |
| Sales     | A valid rep session exists             | Full rep flow and admin flow                                |
| Finance   | An import or valuation API exists      | Request, authorization, audit, replay, and failure behavior |
| Coding    | A worker or adapter slice is Green     | Live PostgreSQL behavior and service health                 |

Use the system browser when the owner requests browser opening.
Do not substitute an in-chat file preview for that request.

## Required Operating Cycle

```text
Select code task
      |
      v
Write Red tests -> Implement Green -> Commit exact scope
                                      |
                                      v
                         Review A and Review B
                                      |
                         findings ----+---- accept
                            |                  |
                            v                  v
                      repair commit      product check
                            |                  |
                            +--------> final acceptance
                                               |
                                               v
                                      plan and Git note
```

Use this cycle for each lane.
Do not start reviews before the candidate source is stable.

## Five-Lane Dispatch Rules

1. Assign one implementation owner to each lane.
2. Give each owner an exact file scope.
3. Record the scope before edits start.
4. Keep one writer per path.
5. Run reviews only after a source commit.
6. Route one finite finding batch to the implementation owner.
7. Repeat reviews after each repair commit.
8. Update plans after source acceptance.
9. Attach Git notes to accepted source commits.
10. Report no product progress when no product code changed.

Review agents must remain read-only.
Review work does not keep a lane active.

## Collision Controls

This repository uses one shared `master` worktree.
Do not create another Git worktree.

Before every dispatch:

```bash
git worktree list --porcelain
git branch --show-current
git status --short
git log -10 --oneline
```

Before an exported symbol change:

```bash
build-graph inspect ./graph.db <symbol>
```

After a structural change:

```bash
build-graph update ./graph.db <changed-files>
```

Before every commit:

```bash
git diff --name-only
git diff --check
git diff --cached --name-only
```

Use these rules:

- Never use `git reset --hard`.
- Never clean the shared tree.
- Never stash another owner's changes.
- Never stage by directory.
- Stage an exact file list.
- Stop a writer when another writer owns the same path.
- Recheck hashes after every concurrent commit.
- Batch shared generated files after lane source commits.

## Existing Dirty Paths

At the handoff baseline, these dirty paths are unrelated to the five current lane candidates:

- `.opencode/goals/**`
- `apps/codecamp-advantage/playwright-report/**`
- `apps/codecamp-advantage/test-results/**`
- `apps/advantage-games/test-results/**`

Preserve these paths.
Do not stage, restore, delete, or rewrite them during lane work.

## Blocker Standard

A blocker must stop one named operation.
It must include current evidence.

Use this format:

```text
Blocked operation:
Required external input:
Current evidence:
Unaffected lane work:
Next executable action:
```

If unaffected work exists, the lane must continue.

Do not use a plan marker as the only blocker evidence.
Verify the marker against code, commits, notes, and owner decisions.

## Status Reporting Contract

Every update must show these fields for all five lanes:

| Field          | Required content                            |
| -------------- | ------------------------------------------- |
| Product change | Exact behavior and source commit            |
| Tests          | Command and result                          |
| Review         | Current commit and verdict                  |
| Product check  | Browser, live database, API, or not yet run |
| Next code task | One executable implementation task          |
| External input | Exact input, or `none`                      |

Do not use percentages without a defined denominator.
Do not describe reviews or documents as shipped features.
Do not report an inventory without checking the current catalog.

## Previous Orchestration Failures

| Failure                                 | Impact                                                | Required control                             |
| --------------------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| Support work replaced product work      | Three lanes lacked implementation in the recent cycle | Require one code-bearing task per lane       |
| Stale gates became current blockers     | Valid work stopped                                    | Recheck Git and owner decisions              |
| APK inventory was stated without proof  | The owner received false status                       | Query catalogs and host routes first         |
| One lane became the active priority     | Four lanes became idle                                | Maintain a five-row active board             |
| Reviews ran on changing files           | Reviews became stale                                  | Commit source before review                  |
| Process counts replaced outcomes        | Reports hid missing product work                      | Separate code, tests, reviews, and docs      |
| Browser requests used the wrong surface | The requested browser did not open                    | Use the system browser tool or `xdg-open`    |
| Reports became too terse                | The owner lost context                                | Show evidence and the next executable action |

## Practices That Worked

- Atomic source commits limited lane collisions.
- Exact file scopes protected unrelated dirty work.
- Git notes preserved test and review evidence.
- Independent reviews found real security and concurrency defects.
- Disposable PostgreSQL tests proved lock behavior and cleanup.
- Marketing rendered sentinels proved actual translation use.
- Finance poison tests hardened trust boundaries.
- APK manifests prevented unsupported source claims.

Keep these practices.
Do not let them replace implementation.

## Existing Task Sessions

These user-owned tasks can provide history:

| Lane      | Task ID                                |
| --------- | -------------------------------------- |
| Finance   | `019ff5d4-4c90-7682-9156-a643b85e99dc` |
| Marketing | `019ff5d4-2772-7973-8846-3d90231e0898` |
| Coding    | `019ff5d4-63b5-7b21-a6b4-e71ed927b413` |
| APK       | `019ff5d4-3466-7122-852b-30c59c3c3022` |
| Sales     | `01a00451-a1f2-7372-8642-4c40be33054d` |

Read the latest task output before reuse.
Treat Git as the source of current repository state.
Do not treat an old task message as current acceptance.

## First Shift for the Successor

1. Verify the shared worktree and dirty exclusions.
2. Read the registry and all five current plans.
3. Verify the owner facts in this document.
4. Assign five code-bearing tasks.
5. Publish an exact path ownership table.
6. Start Red or Green implementation in every lane.
7. Open Marketing and APK surfaces after their first Green slices.
8. Report the first code diff from each lane.

The successor should not ask the owner to manage this process.
The repository evidence must show whether orchestration is working.
