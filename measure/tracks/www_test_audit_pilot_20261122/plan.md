# Implementation Plan: www test audit pilot

> **Track ID:** `www_test_audit_pilot_20261122` · **Spec:** [spec.md](./spec.md)
> **Source:** PM plan A-66, `/home/daniebo/Desktop/handoff/a66-monorepo-test-audit/plan.md` (Daniel, approved 2026-11-17).
> **Scope:** test files under `apps/www-reading-advantage` only.

## Rules for this plan

1. Markers: `[ ]` pending, `[~]` in progress, `[x]` done, `[b]` at a human gate.
2. Each task names its acceptance criterion in the form `Test: (x)`.
3. One commit per class. A commit holds one class only.
4. No production code changes. Test files only.
5. Pathspec commits only. No `git add -A`, no `git commit -a`, no stash, and no reset.
6. Every heavy command runs as `HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
7. No push of this track before its phase acceptance. It ships with a later www push.
8. The daily www publish at 06:00 Bangkok wins. The track pauses at 05:45 when a role runs.
9. This plan holds no baseline number. Counts live in the run logs only.
10. No test count from source plan §2 appears in this plan.

## Role note (accepted deviation for test-only work)

Red writes no failing test in Phase 2 and Phase 3.
A deletion or a rewrite of a test is the change itself.
The roles run in this order.
`measure-strategy` runs in Phase 1 only and writes `test-strategy.md`.
It decides whether Review B applies.
`measure-mid-red` does 1.1 and 1.2 and changes no file under `apps/`.
Its role gate runs with `RED_TEST_COMMAND` unset.
The gate checks only that no file under `apps/` changed.
It also checks that `classification.md` and the baseline logs exist.
`measure-review-a-correctness` does 1.3 on a model family different from the classifier.
The check is report-only.
`measure-jr-green` makes every commit of Phases 2-3 and the checkpoints.
After each Green commit the orchestrator runs the jr-green role gate.
It runs `GREEN_TEST_COMMAND='CI=true pnpm --filter www-reading-advantage exec vitest run --maxWorkers=1 --reporter=dot'` through heavy-run.
It also runs `pnpm --filter www-reading-advantage test:coverage` through heavy-run.
It compares line coverage to the baseline (fall of 1 point or less).
Reviews A/C and phase acceptance run as usual.
This breaks the standard Red-then-Green order of `measure/workflow.md`.
The spec reviewer judged this deviation before Red starts.

## Phase 1: Baseline and classification

Phase gate: the suite passes, and the logs exist.

- [x] 1.1 Record the baseline. Test: (a), (b), (c).
  Run the green test command through the runner.
  Run the coverage command through the runner.
  Evidence: measure/runs/www_test_audit_pilot_20261122/baseline.json with its `.log`.
  Both runner commands exited 0. Plan holds no number.
- [x] 1.2 Classify every www test file. Test: (e), (f).
  Evidence: measure/tracks/www_test_audit_pilot_20261122/classification.md.
  One row per file, split per describe block with case names when a file mixes classes.
  K rows first. Each `e2e/*.spec.ts` Playwright file has a row marked not counted.
  The scripts i18n-cli suite is marked not counted (excluded from the Vitest run).
  Plan holds no number.
- [ ] 1.3 Second-check 10 % of the rows. Test: (e), (f).
  A different model family re-checks 10 % of the rows.
  `measure-review-a-correctness` does the check on a model family different from the classifier.
  The check is report-only.
  It writes `measure/runs/www_test_audit_pilot_20261122/second-check-<short-head>.json` with its `.log`.
  A disagreement rate above 15 % stops the track.
  The PM then fixes the rubric.
- [ ] 1.4 Checkpoint Phase 1. Test: (c).
  Commit the plan update with the log paths.
  Phase 1 ships no test change.

## Phase 2: Delete batch (D1-D5)

Phase gate after every commit: the suite passes, and coverage falls by 1 point or less.
Each task below is one commit for one class.

- [ ] 2.1 Delete class D1. Test: (a), (b), (c), (d).
- [ ] 2.2 Delete class D2. Test: (a), (b), (c), (d).
- [ ] 2.3 Delete class D3. Test: (a), (b), (c), (d).
- [ ] 2.4 Delete class D4. Test: (a), (b), (c), (d).
- [ ] 2.5 Replace class D5. Test: (a), (b), (c), (d).
- [ ] 2.6 Checkpoint Phase 2. Test: (a), (b), (c).
  Record each commit SHA and its gate log in the task line.

## Phase 3: Rewrite batch (R1-R3)

Phase gate after every commit: the suite passes, and coverage falls by 1 point or less.
Each task below is one commit for one class.

- [ ] 3.1 Rewrite class R1. Test: (b), (c), (d).
- [ ] 3.2 Rewrite class R2. Test: (b), (c), (d).
- [ ] 3.3 Rewrite class R3. Test: (b), (c), (d).
- [ ] 3.4 Checkpoint Phase 3. Test: (b), (c).
  Record each commit SHA and its gate log in the task line.

## Phase 4: Pilot report

- [ ] 4.1 Write the pilot report. Test: (f).
  File: `measure/tracks/www_test_audit_pilot_20261122/report.md`.
  The report lists what went, what changed, and why.
  It lists the per-class commits and the per-commit gate results.
  It lists the K rows kept and the duplicates that kept each rule.
- [ ] 4.2 Record the CI test time for www before and after. Test: (f).
  Append both durations to the report.
  Take both durations from the runner logs.
- [ ] 4.3 Checkpoint Phase 4. Test: (a), (b), (c), (d), (e), (f).
  Commit the plan update with the report path.
