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

- [x] 1.1 Record the baseline. Test: (a), (b), (c). (08bec4c36)
  Commit: 08bec4c365bac5c15795b144bc45a86c42714f20.
  Run the green test command through the runner.
  Run the coverage command through the runner.
  Evidence: measure/runs/www_test_audit_pilot_20261122/baseline.json with its `.log`.
  Both runner commands exited 0. Plan holds no number.
- [x] 1.2 Classify every www test file. Test: (e), (f). (d1b9d597b)
  Commit: d1b9d597b553f6033ef39029491eb2a13a550337.
  Earlier classification commits: 08bec4c36, 1d4ddd2c0.
  Evidence: measure/tracks/www_test_audit_pilot_20261122/classification.md.
  One row per file, split per describe block with case names when a file mixes classes.
  K rows first. Each `e2e/*.spec.ts` Playwright file has a row marked not counted.
  The scripts i18n-cli suite is marked not counted (excluded from the Vitest run).
  Plan holds no number.
- [x] 1.3 Second-check 10 % of the rows. Test: (e), (f). (d1b9d597b)
  Commit: d1b9d597b553f6033ef39029491eb2a13a550337.
  A different model family re-checks 10 % of the rows.
  `measure-review-a-correctness` does the check on a model family different from the classifier.
  The check is report-only.
  It writes `measure/runs/www_test_audit_pilot_20261122/second-check-<short-head>.json` with its `.log`.
  A disagreement rate above 15 % stops the track.
  The PM then fixes the rubric.
  Evidence: measure/runs/www_test_audit_pilot_20261122/second-check-08bec4c.json (fail),
  measure/runs/www_test_audit_pilot_20261122/second-check-1d4ddd2.json (under stop rule),
  measure/runs/www_test_audit_pilot_20261122/second-check-d1b9d59.json (pass).
  Chain: second-check-08bec4c fail -> Red r2 1d4ddd2c0 -> second-check-1d4ddd2
  -> Red r3 d1b9d597b -> second-check-d1b9d59 pass. Rate in the log.
- [x] 1.4 Checkpoint Phase 1. Test: (c). (a1caa5803)
  Commit: a1caa58034f6455e91205a5673ef172a974a7992.
  Commit the plan update with the log paths.
  Phase 1 ships no test change.

## Phase 2: Delete batch (D1-D5)

Phase gate after every commit: the suite passes, and coverage falls by 1 point or less.
Each task below is one commit for one class.

- [x] 2.1 Delete class D1. Test: (a), (b), (c), (d). (0be4a0374)
  Commit: 0be4a0374748e38d7ad504815441f0a9b3e3ee12.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-0be4a037.json.
  GREEN exit 0: measure/runs/www_test_audit_pilot_20261122/green-0be4a037.log.
  COVERAGE exit 0: measure/runs/www_test_audit_pilot_20261122/coverage-0be4a037.log.
  cases_before=3175, cases_after=3168, line_coverage_pct=89.92, floor=85.52.
- [x] 2.2 Delete class D2. Test: (a), (b), (c), (d). (e332f594e)
  Commit: e332f594e70498666ce2f3c9c5c2afc492dceea4.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-e332f594.json.
  GREEN exit 0: measure/runs/www_test_audit_pilot_20261122/green-e332f594.log.
  COVERAGE exit 0: measure/runs/www_test_audit_pilot_20261122/coverage-e332f594.log.
  cases_before=3168, cases_after=3146, line_coverage_pct=89.92, floor=85.52.
  22 duplicate cases removed from 6 files. Every named duplicate stays.
- [x] 2.3 Delete class D3. Test: (a), (b), (c), (d). (409108d3e)
  Commit: 409108d3e04b418c26390d15a25a66a8a8180dfb.
  No D3 rows (r2 note 2). No test commit and no gate.
- [x] 2.4 Delete class D4. Test: (a), (b), (c), (d). (0d705612d)
  Commit: 0d705612d77a786b42484f5df067f9bbb54e2389.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-0d705612.json.
  GREEN exit 0: measure/runs/www_test_audit_pilot_20261122/green-0d705612.log.
  COVERAGE exit 0: measure/runs/www_test_audit_pilot_20261122/coverage-0d705612.log.
  cases_before=3146, cases_after=3140, line_coverage_pct=89.86, floor=85.52.
  6 weak-check cases removed from 3 files. No result-checking test was weakened.
- [x] 2.5 Replace class D5. Test: (a), (b), (c), (d). (407c5d9bd)
  Part 1: ee5c7b7390847eee0879ca9e8fa94b5eb4d33bd3. 4 pins.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-ee5c7b73.json.
  Part 2: 7008ccefd63494410c7790bed26ead80fb6dd8c0. 102 pins.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-7008ccef.json.
  Part 3: c577cdf18746f049571f21103bf8870dce0d114f. 61 pins across
  www-batch-20261116.locale.test.ts, www-batch-20261119.locale.test.ts, and
  www-stem-date-line.locale.test.ts.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-c577cdf.json.
  GREEN exit 0: measure/runs/www_test_audit_pilot_20261122/green-c577cdf.log.
  COVERAGE exit 0: measure/runs/www_test_audit_pilot_20261122/coverage-c577cdf.log.
  cases_before=3081, cases_after=3048, line_coverage_pct=89.94, floor=85.52.
  Part 4: 407c5d9bd88b840bd896c2f36defb466c8d90832. 54 pins across
  tutor-calculator, tutor-reedy-claim, features-content, pricing-content,
  features-pricing locale, Storytime content, reading-card, and codecamp page.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-407c5d9.json.
  GREEN exit 0: measure/runs/www_test_audit_pilot_20261122/green-407c5d9.log.
  COVERAGE exit 0: measure/runs/www_test_audit_pilot_20261122/coverage-407c5d9.log.
  cases_before=3048, cases_after=3035, line_coverage_pct=90.03, floor=85.52.
  All 221 D5 pins were reviewed. Fact guards stayed as K with a reason in the
  part commit body and the run log. No tutor-commission money test changed.
- [x] 2.6 Checkpoint Phase 2. Test: (a), (b), (c). (409108d3e)
  D1: 0be4a0374748e38d7ad504815441f0a9b3e3ee12.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-0be4a037.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-0be4a037.log.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-0be4a037.json.
  D2: e332f594e70498666ce2f3c9c5c2afc492dceea4.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-e332f594.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-e332f594.log.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-e332f594.json.
  D3: no rows, no test commit, no gate.
  D4: 0d705612d77a786b42484f5df067f9bbb54e2389.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-0d705612.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-0d705612.log.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-0d705612.json.
  D5 parts: ee5c7b739, 7008ccefd, c577cdf18, 407c5d9bd with the four gates
  listed in task 2.5. Final phase 2 GREEN log:
  measure/runs/www_test_audit_pilot_20261122/green-407c5d9.log.
  Final phase 2 COVERAGE log:
  measure/runs/www_test_audit_pilot_20261122/coverage-407c5d9.log.
  Lint through heavy-run, exit 0 with 3 warnings:
  measure/runs/www_test_audit_pilot_20261122/lint-407c5d9.log.
  Check-types through heavy-run, exit 0:
  measure/runs/www_test_audit_pilot_20261122/check-types-407c5d9.log.

- [x] 2.7 Review A remediation round A (9eb3b9c4f)
  Fix commits: 733319505, fb5622ed7, 9eb3b9c4f.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-9eb3b9c4.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-9eb3b9c4.log.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-9eb3b9c4.json.
- [x] 2.8 Review A remediation round B (4d1688131)
  Fix commit: 4d168813116345c2b6684bcc543c2c33279f9cfa.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-4d168813.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-4d168813.log.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-4d168813.json.
  Proof logs: measure/runs/www_test_audit_pilot_20261122/proof-f2a.log,
  proof-f2b.log, proof-f3a.log, proof-f3b.log, proof-f4a.log, proof-f4b.log.
- [x] 2.9 Review A remediation round C (bcaa97ff4)
  Fix commits: 7480484d4 (D1: F2, F4, F17), bcaa97ff4 (D5: F9, F12).
  F2 proof: measure/runs/www_test_audit_pilot_20261122/proof-f2-r2.log.
  F4 proof: measure/runs/www_test_audit_pilot_20261122/proof-f4-r2.log.
  F9 proof: measure/runs/www_test_audit_pilot_20261122/proof-f9-r2.log.
  F12 proof: measure/runs/www_test_audit_pilot_20261122/proof-f12-r2.log.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-7480484.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-7480484.log.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-7480484.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-bcaa97f.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-bcaa97f.log.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-bcaa97f.json.

### Recorded deviations

- (F11) D1 commit 0be4a0374 also rewrote the two R2 cases of classification.md:195 (rendered full-width pictured row; text-only exclusion); history is not rewritten; task 3.2 counts them as done in 0be4a0374. Approved by the PM as a recorded exception on 2026-11-23 (Review A round 4, review-a-cab8ffd.json).
- (F10) The separate GREEN log at 7008ccefd is missing; the coverage run at that commit (coverage-7008ccef.log) ran the full suite with exit 0. New evidence: measure/runs/www_test_audit_pilot_20261122/green-at-7008ccef.log, GREEN through heavy-run, exit 0. Install method: node_modules symlinked from the role-base worktree. Both heavy-run installs failed or hung at the puppeteer postinstall.
- (F16) Round A commits 733319505 and fb5622ed7 were gated together at 9eb3b9c4f. New evidence through heavy-run, each exit 0: measure/runs/www_test_audit_pilot_20261122/green-at-733319505.log, coverage-at-733319505.log, green-at-fb5622ed7.log, coverage-at-fb5622ed7.log. Install method: node_modules symlinked from the role-base worktree.

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
