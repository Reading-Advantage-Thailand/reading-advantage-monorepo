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
  listed in task 2.5. Task 2.6 checkpoint GREEN log:
  measure/runs/www_test_audit_pilot_20261122/green-407c5d9.log.
  Task 2.6 checkpoint COVERAGE log:
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
- [x] 2.10 Phase acceptance remediation (3b044ec9)
  Fix commits: 7c2d93e2 (D1: F1, F2), 3b044ec9 (D5: F3).
  D1 GREEN log: measure/runs/www_test_audit_pilot_20261122/green-7c2d93e2.log.
  D1 COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-7c2d93e2.log.
  D1 gate: measure/runs/www_test_audit_pilot_20261122/gate-7c2d93e2.json.
  D1 proof logs: measure/runs/www_test_audit_pilot_20261122/proof-pa-f1.log,
  measure/runs/www_test_audit_pilot_20261122/proof-pa-f2.log.
  D5 GREEN log: measure/runs/www_test_audit_pilot_20261122/green-3b044ec9.log.
  D5 COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-3b044ec9.log.
  D5 gate: measure/runs/www_test_audit_pilot_20261122/gate-3b044ec9.json.
  D5 proof log: measure/runs/www_test_audit_pilot_20261122/proof-pa-f3.log.
  Each proof log holds the failing run of the fixed check under a temporary
  copy change. The copy change was restored before each commit.
- [x] 2.11 Adversarial remediation ADV-3 (e153b885)
  Fix commit: e153b885 (D5: ADV-3).
  The eligibility check now lives in
  apps/www-reading-advantage/src/__tests__/fixtures/reedy-eligibility.ts.
  The main test and the adversarial probe file import that fixture.
  The English set names the plain, the hyphenated, and the prefixed forms.
  The Thai set names the cancelled package next to the package phrase.
  The zh set stays as it was.
  Every adversarial probe and its expectation stayed in the probe file.
  Proof log: measure/runs/www_test_audit_pilot_20261122/proof-adv3.log.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-e153b88.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-e153b88.log.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-e153b88.json.
  The type check still fails on the D1 file
  src/__tests__/no-gse-in-customer-copy.test.ts. The D1 rewrite 4d1688131
  introduced those page calls. The D5 commit changes no line of that file.
  Evidence: measure/runs/www_test_audit_pilot_20261122/check-types-adv3.log.
- [x] 2.12 Type check repair (8d5ad1c4)
  Fix commit: 8d5ad1c4 (D1: the eight page call types).
  Eight page components take no props. The sweep now calls each of them
  without an argument. The other page calls keep their props argument.
  Every assertion stayed as it was. No page component changed.
  Proof log: measure/runs/www_test_audit_pilot_20261122/proof-adv3-types.log.
  Check-types log: measure/runs/www_test_audit_pilot_20261122/check-types-09a817c.log.
  Lint log: measure/runs/www_test_audit_pilot_20261122/lint-09a817c.log.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-8d5ad1c4.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-8d5ad1c4.log.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-8d5ad1c4.json.

- [x] 2.13 Adversarial remediation ADV-4 to ADV-6 (dce443985)
  Fix commit: dce44398537f4b57d24cb4611a53847805466cc1. D5: the shared
  eligibility fixture apps/www-reading-advantage/src/__tests__/fixtures/reedy-eligibility.ts.
  The English inactive set adds formerly, previously, no longer, lapsed, and
  expired. The Thai set adds หมดอายุ. The Chinese set adds 过期 and 已过期.
  A positive check requires each shipped eligibility sentence to equal one
  approved sentence per locale, so any other rewording fails. The approved
  list holds four sentences per locale, written in the fixture, and every
  shipped eligibility sentence matches one of them. Probe expectations stayed
  as committed at role base 7b15edd95. The probe file passes 9 of 9, the
  shipped copy passes, and the negative controls still break.
  phase_base_sha: a1caa58034f6455e91205a5673ef172a974a7992.
  role_base_sha: 7b15edd958f7c06651922e19c189b7e238250e5b.
  Proof log: measure/runs/www_test_audit_pilot_20261122/proof-adv456.log.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-dce4439.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-dce4439.log.
  Check-types log: measure/runs/www_test_audit_pilot_20261122/check-types-dce4439.log.
  Lint log: measure/runs/www_test_audit_pilot_20261122/lint-dce4439.log.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-dce4439.json.
  The four gates exited 0 through heavy-run. Line coverage is 91.6 percent,
  above the 85.52 floor. The lint log holds zero errors and three known
  warnings in files this commit does not touch. The gates ran on the exact
  content captured by the fix commit; no file changed between the runs and
  the commit. The implementation and plan commit headers were shortened from
  the requested wording to satisfy the 100-character commitlint limit; the
  meaning and track id stay.

### Recorded deviations

- (F11) D1 commit 0be4a0374 also rewrote the two R2 cases of classification.md:195 (rendered full-width pictured row; text-only exclusion); history is not rewritten; task 3.2 counts them as done in 0be4a0374. Approved by the PM as a recorded exception on 2026-11-23 (Review A round 4, review-a-cab8ffd.json).
- (F10) The separate GREEN log at 7008ccefd is missing; the coverage run at that commit (coverage-7008ccef.log) ran the full suite with exit 0. New evidence: measure/runs/www_test_audit_pilot_20261122/green-at-7008ccef.log, GREEN through heavy-run, exit 0. Install method: node_modules symlinked from the role-base worktree. Both heavy-run installs failed or hung at the puppeteer postinstall.
- (F16) Round A commits 733319505 and fb5622ed7 were gated together at 9eb3b9c4f. New evidence through heavy-run, each exit 0: measure/runs/www_test_audit_pilot_20261122/green-at-733319505.log, coverage-at-733319505.log, green-at-fb5622ed7.log, coverage-at-fb5622ed7.log. Install method: node_modules symlinked from the role-base worktree.
- (F4) The gate file gate-0be4a037.json names the Phase 1 strategy commit as its phase_base_sha. The gate file is a run artifact, so it stays as it is. The D1 implementation commit and its two logs give the correct D1 result. Git shows no app change between the strategy commit and the Phase 2 base.

## Phase 3: Rewrite batch (R1-R3)

Phase gate after every commit: the suite passes, and coverage falls by 1 point or less.
Each task below is one commit for one class.

- [x] 3.1 Rewrite class R1 (no rows, classification.md R1 table is empty) (8a126f612)
  The R1 table holds no rows. Boundary mocks stand in for adapters, not for
  the code under test. No rewrite was needed.
- [x] 3.2 Rewrite class R2 (adf24e723)
  Fix commit: adf24e72376a4f061b9f3c435b4b4f5a62334fae.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-adf24e7.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-adf24e7.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-adf24e7.log.
  Check-types log: measure/runs/www_test_audit_pilot_20261122/check-types-adf24e7.log.
  Lint log: measure/runs/www_test_audit_pilot_20261122/lint-adf24e7.log.
  cases_before=3094, cases_after=3094, line_coverage_pct=91.6, floor=85.52.
  Nine files now assert computed CSS through
  src/__tests__/fixtures/real-css.ts or a role-based selector. No rewritten
  case asserts a class-name token. Each file has one mutation proof in a
  proof-r2-<file>.log: a temporary production edit breaks the guarded
  behavior, the target test exits 1, and git checkout restores the source.
  The two R2 cases of classification.md:195 were already rewritten in D1
  commit 0be4a0374 under recorded deviation F11. They live in
  src/__tests__/www-features-look-pins.red.test.ts as the full-width row and
  text-only exclusion cases. They still pass (14 cases) and the file holds
  no class-name assertion. They were not rewritten again.
- [x] 3.3 Rewrite class R3 (no rows) (8a126f612)
  The R3 table holds no rows. Case names already state the rule or contract
  id. No rename or split was needed.
- [x] 3.4 Checkpoint Phase 3 (1d3e467f)
  R2: adf24e72376a4f061b9f3c435b4b4f5a62334fae.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-adf24e7.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-adf24e7.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-adf24e7.log.
  Merge: 257a6b0cdd54b3448a16370ff138750ae1fc97f5.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-257a6b0c.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-257a6b0c.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-257a6b0c.log.
  R1 and R3 had no rows, so neither class has a commit.
- [x] 3.5 Merge blog-posts-validation into one case per rule (257a6b0cd)
  Commit: 257a6b0cdd54b3448a16370ff138750ae1fc97f5.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-blog-merge.log.
  cases_before=3094, cases_after=1385, cut=1709 cases.
  The validation file fell from 1726 per-post cases to 17 cases: fifteen rule
  cases and two discovery cases. Each rule case walks every post and collects
  one "<locale>/<slug>: <rule>" line per broken post.
  Three mutations of one en post each exited 1 and named
  en/1-district-1-quality-school with the broken rule. The post file was
  restored after each mutation. No post file changed in the commit.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-257a6b0c.json.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-257a6b0c.log.
  Line coverage is 91.6 percent, above the 85.52 floor and the 86.52 baseline.
  The merge counts toward the 20 % target under the Approved merge line.
- [x] 3.6 Review A remediation F19 (09c48878d)
  Commit: 09c48878d82fee91688f88ee97bb1aa667b34d0a.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-f19-phase-4-browser-regressions.log.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-f19-phase-4-browser-regressions-remaining.log.
  cases_before=1385, cases_after=1388. The new fixture unit test adds three cases.
  The isDarkText helper is gone from both R2 contrast tests. Each test now
  uses contrastOf from src/__tests__/fixtures/contrast.ts. The fixture parses
  hex, rgb(a) and oklch from the real compiled CSS, resolves the background
  from the element and its ancestors, blends alpha, and throws on an
  unresolved foreground. The assertion is a ratio of at least 4.5 to 1.
  The unit test at src/__tests__/contrast-fixture.test.ts pins the F19 fault:
  rgb(120,120,120) on #faf9f7 is below 4.5. It also pins black on white at 21
  and a throw on an unparseable colour.
  Two production mutations, a sky-300 contact eyebrow and a slate-400 pricing
  title, each failed the target test. Each production file was restored.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-09c48878d.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-09c48878d.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-09c48878d.log.
  Line coverage is 91.64 percent, above the 85.52 floor.
- [x] 3.7 Review A remediation F20 (0f63c5a9a)
  Commit: 0f63c5a9acd42b0b35f2690962aa1db85b9a5ed9.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-f20-phase-4-browser-regressions.log.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-f20-phase-4-browser-regressions-remaining.log.
  cases_before=1388, cases_after=1394. Six new backdrop unit cases raise the count.
  resolveBackdrop now walks ancestors recursively. It composites each
  translucent layer over the resolved backdrop of its parent, stops at an
  opaque layer, skips a fully transparent layer, and falls back to the page
  background at the root. A background image or a colour the parser cannot
  read throws with the element tag and the offending value. Custom properties
  defined by the compiled stylesheet resolve from that stylesheet. Foreground
  colours stay strict.
  The unit test pins the composed ratio for translucent over translucent over
  an opaque ancestor, translucent over the page, gradient and unsupported
  colour throws, a transparent skip, and an opaque stop.
  Both R2 contrast tests still pass on the shipped pages. A sky-300 contact
  eyebrow and a slate-400 pricing title each failed the target test with exit
  1. Each production file was restored.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-0f63c5a9a.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-0f63c5a9a.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-0f63c5a9a.log.
  Line coverage is 91.76 percent, above the 85.52 floor.
- [x] 3.8 Review A remediation F21 (93a16fe3b)
  Commit: 93a16fe3bcd37d303faa78f5c0d8975ce376063b.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-f21-phase-4-browser-regressions.log.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-f21-phase-4-browser-regressions-remaining.log.
  cases_before=1394, cases_after=1396. The two new cascade unit cases add the count.
  The class-token background reader is gone. real-css.ts exports the compiled
  stylesheet and a copy with @layer wrappers removed and @property rules
  dropped, because jsdom ignores layered rules and cannot parse @property.
  contrast.ts injects that stylesheet once into the test document and reads
  color and background-color with window.getComputedStyle. jsdom then applies
  class, type, id and descendant selectors. Recursive composition stays:
  opaque stops, translucent composes over the parent backdrop, transparent is
  skipped, background images and unreadable values throw, and unresolved
  foreground throws.
  The unit test adds a case where a type-selector body background and a
  descendant-selector translucent layer compose to a hand-computed backdrop
  and ratio. It adds a case where the body rule is the only painted background
  and the resolver uses it instead of white.
  Both R2 contrast tests still pass on the shipped pages. A sky-300 contact
  eyebrow and a slate-400 pricing title each failed the numeric contrast
  assertion with exit 1. Each production file was restored.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-93a16fe3b.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-93a16fe3b.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-93a16fe3b.log.
  Line coverage is 91.83 percent, above the 85.52 floor.
- [x] 3.9 Adversarial remediation ADV-8 (98c2713d3)
  Commit: 98c2713d3046bfbf886c2e9c9ad097f46849ddd8.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-adv8.log.
  cases_before=1397, cases_after=1397. The committed adversarial probe adds
  one case over the prior 1396. This fix adds no case.
  The loader now lives in src/__tests__/fixtures/blog-posts-loader.ts. It
  lists every non-hidden regular file in each locale directory, exposes that
  list to the probe, and parses only .md files as posts. The extension rule
  and both discovery cases now flag Markdown-like files that are not .md and
  name them as <locale>/<file>. The shipped -segments.json data files are not
  post candidates and stay ignored. The probe keeps its expectation; only its
  loader setup now calls the shared listPostFiles.
  The proof copies a valid en post to en/zz-adversarial-mdx-probe.mdx. The
  extension rule and both discovery cases fail and name the file. The probe
  file is deleted and no leftover exists. The shipped posts pass.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-98c2713d3.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-98c2713d3.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-98c2713d3.log.
  Line coverage is 91.93 percent, above the 85.52 floor.
- [x] 3.10 Adversarial remediation ADV-11 (88b26fb9b)
  Commit: 88b26fb9b9959f47f7ec9d71cfff629aa4c5b75f.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-adv11.log.
  cases_before=1397, cases_after=1398. The adversarial commit added a second
  probe case. This fix adds no case.
  The fixture now owns the mislabelled-file predicate. A name with a
  case-insensitive .md suffix that is not exactly .md is flagged, along with
  .mdx, .markdown, other Markdown-like extensions and extensionless files.
  Data companions such as -segments.json stay ignored. The validation test
  imports the shared predicate. The probe keeps its expectation and uses the
  shared predicate in its setup. All 15 rules and both discovery cases remain.
  The proof copies a valid th post to th/zz-adv-upper.MD. The extension rule
  and both discovery cases fail and name the file. The temporary file is
  deleted and no leftover exists. The shipped posts pass.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-88b26fb9b.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-88b26fb9b.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-88b26fb9b.log.
  Line coverage is 91.95 percent, above the 85.52 floor.
  ADV-12 is an optional note. It received no change.
- [x] 3.11 Phase acceptance remediation F22 to F24 (286d95a99)
  F22: 286d95a99b52c2f4a0d22c09b74afba37f0f972b.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-f22.log.
  cases_before=1398, cases_after=1399. The new dotfile unit test adds one case.
  The loader no longer skips dot-prefixed names. blog.ts markdownSlugs filters
  only by the .md suffix, and a comment cites it. The loader takes an optional
  base directory for the temporary-directory unit test.
  F23: de68074d977a2bc3b7000b99f2527d0cd9d9649f.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-f23.log.
  cases_before=1399, cases_after=1402. Three new unit cases raise the count.
  Custom properties resolve from the element cascade: inline, then jsdom
  computed value, then the compiled :root map. An undecidable override throws.
  F24: 338047c69f1d7c71564c670d11ef3aab1ed782ae.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-f24.log.
  cases_before=1402, cases_after=1402. No case was added.
  The hero tests compare every gradient stop with values from the compiled
  stylesheet through real-css.ts.
  F22 gate: measure/runs/www_test_audit_pilot_20261122/gate-286d95a99.json.
  F23 gate: measure/runs/www_test_audit_pilot_20261122/gate-de68074d9.json.
  F24 gate: measure/runs/www_test_audit_pilot_20261122/gate-338047c69.json.
  COVERAGE logs: coverage-286d95a99.log, coverage-de68074d9.log and
  coverage-338047c69.log in measure/runs/www_test_audit_pilot_20261122/.
  Line coverage is 92.06 percent at the last gate, above the 85.52 floor.
  Each proof restored its production file. No production or post change remains.
- [x] 3.12 Adversarial remediation ADV-15 (a53d426d5)
  Commit: a53d426d5ba9fcf5c0a1f4a85c59a1280c4b96f7.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-adv15.log.
  cases_before=1402, cases_after=1405. The three committed probe cases add the count.
  No CSS cascade was rebuilt. The helper fails closed: a --color-* custom
  property declared on the element or any ancestor throws with the tag and
  property name. The compiled stylesheet is scanned once for colour-token
  declarations outside :root, :host or html; a matching selector throws with
  the selector and name, and an unevaluable selector throws. The root token map
  stays the only resolved source.
  The two F23 unit cases that expected an inline override to change the ratio
  now expect a throw. Failing closed replaces the resolve-from-element rule.
  The probe's ADV-15 assertion now expects a throw naming --color-slate-900;
  its two held cases still pass.
  Both R2 contrast tests pass on the shipped pages. The proof adds an inline
  --color-slate-900 to the pricing h1; the contrast case throws with the
  property name. The production file was restored.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-a53d426d5.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-a53d426d5.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-a53d426d5.log.
  Line coverage is 91.79 percent, above the 85.52 floor.
- [x] 3.13 Adversarial remediation ADV-17 to ADV-19 (6be92dd85)
  Commit: 6be92dd85838aeead1d28b160d5f1cad5e79e902.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-adv17.log.
  cases_before=1405, cases_after=1408. One committed probe case and two new
  unit cases add the count.
  The stylesheet guard now runs at read time over every document.styleSheets
  entry, including the injected compiled copy, and recurses into grouping
  at-rules. A style rule outside :root, :host or html that declares a --color-*
  token throws with the selector and name when the tested element or any
  ancestor matches it. An unevaluable selector throws. Inline --color-*
  declarations still throw. The root token map stays the only resolved source.
  The two new unit cases cover an ancestor match (ADV-18) and a rule inside
  @media (ADV-19). The probe expectations were not changed.
  The proof records the probe at 4 of 4, the fixture at 16 of 16, and both R2
  contrast tests passing with no false throw. No production edit was needed.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-6be92dd85.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-6be92dd85.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-6be92dd85.log.
  Line coverage is 92.01 percent, above the 85.52 floor.
- [x] 3.14 Phase acceptance remediation F25 (7b62bed78)
  Commit: 7b62bed78b4bfefdb6abecf2579869150c2de476.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-f25.log.
  cases_before=1408, cases_after=1410. The two new symlink unit cases add the count.
  The loader accepts a regular file or a symbolic link whose target, checked
  with statSync, is a regular file. A broken link is reported by brokenPostRefs
  and asserted empty in both discovery cases, so it is named instead of
  crashing or being skipped. Dotfiles, the extension rule and the -segments.json
  allowance are unchanged.
  The new unit test uses a temporary directory to prove a symlinked blank-title
  .md post is loaded and that a broken link is flagged.
  The proof symlinks a blank-title file outside the posts dir as
  en/zz-symlink-probe.md. The title rule fails and names en/zz-symlink-probe.
  Both temporary paths were removed. No post or production file changed.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-7b62bed78.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-7b62bed78.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-7b62bed78.log.
  Line coverage is 92.07 percent, above the 85.52 floor.
- [x] 3.15 Adversarial remediation ADV-22 (66aeb1011)
  Commit: 66aeb1011cd33b6ed591deed3acad4ae6f76f2b0.
  Proof: measure/runs/www_test_audit_pilot_20261122/proof-adv22.log.
  cases_before=1410, cases_after=1412. One committed probe case and one new
  symlink unit case add the count.
  brokenPostRefs now reports any entry whose name ends in .md, case
  insensitively, that is not a readable regular file after following links:
  broken links, symlinks to directories, sockets, fifos and directories named
  .md. The old export name stays working for existing tests. Both discovery
  cases assert the list is empty, so such an entry is named.
  The symlink test adds a case for a symlink to a directory named .md. The
  proof symlinks th/zz-adv-dirlink.md to an existing directory; both discovery
  cases fail and name the link. The link was removed with no leftover.
  The probe expectations were not changed. ADV-23 is a note and received no change.
  Gate: measure/runs/www_test_audit_pilot_20261122/gate-66aeb1011.json.
  GREEN log: measure/runs/www_test_audit_pilot_20261122/green-66aeb1011.log.
  COVERAGE log: measure/runs/www_test_audit_pilot_20261122/coverage-66aeb1011.log.
  Line coverage is 92.07 percent, above the 85.52 floor.

## Phase 4: Pilot report

- [x] 4.1 Write the pilot report (289c4451c)
  Report: measure/tracks/www_test_audit_pilot_20261122/report.md.
  Commit: 289c4451c643a0b054a0b45a1dda0d8650a362c3.
  The report lists what went, what changed, and why.
  It lists the per-class commits and the per-commit gate results.
  It lists the 77 K rows kept and the duplicates that kept each rule.
  It lists every finding F1 to F26 and ADV-1 to ADV-24.
- [x] 4.2 Record the CI test time for www before and after (289c4451c)
  Commit: 289c4451c643a0b054a0b45a1dda0d8650a362c3.
  Before: 90.47s in measure/runs/www_test_audit_pilot_20261122/baseline.log.
  After: 98.11s in measure/runs/www_test_audit_pilot_20261122/green-66aeb1011.log.
  The difference is +7.64s. Both runs used heavy-run and the same Vitest command.
- [x] 4.3 Checkpoint Phase 4 (289c4451c)
  Commit: 289c4451c643a0b054a0b45a1dda0d8650a362c3.
  Report: measure/tracks/www_test_audit_pilot_20261122/report.md.
  The raw case cut is 1763 cases, or 55.5 percent of the 3175 baseline
  (measure/runs/www_test_audit_pilot_20261122/baseline.json and
  measure/runs/www_test_audit_pilot_20261122/gate-66aeb1011.json).
  The 20 percent target is met. Line coverage rose from 86.52 percent to
  92.07 percent (baseline.json and gate-66aeb1011.json).
  All Phase 4 report gates exited 0.
- [x] 4.4 Report review remediation F27 F28 (f68593cbc)
  Commit: f68593cbc1a45e6c61975e6debf6d4da55c2a29c.
  Review log: measure/runs/www_test_audit_pilot_20261122/review-a-4d41866.log.
  Report: measure/tracks/www_test_audit_pilot_20261122/report.md.
  F27: all 77 K rows now carry a Mutation check column. Sixty-seven rows say
  none. Ten rows name proof logs from measure/runs/www_test_audit_pilot_20261122/.
  The case sum stays at 2843 (classification.md:226).
  F28: the Time section states that the cause is not recorded, gives a labelled
  HYPOTHESIS, and quotes the five slowest files from one head timing run.
  Timing evidence: measure/runs/www_test_audit_pilot_20261122/timing-at-head.log
  and measure/runs/www_test_audit_pilot_20261122/timing-at-head.json.
  The before comparison by file is not recorded. The baseline suite was not run.
  No test or production file changed in this round.
- [x] 4.5 Report review remediation F29 (e97dc1353)
  Commit: e97dc13537b4a6c7965e87e0f2f6bde9759b8d1f.
  Review log: measure/runs/www_test_audit_pilot_20261122/review-a-e034575.log.
  Report: measure/tracks/www_test_audit_pilot_20261122/report.md.
  The report named a root duration field in timing-at-head.json. That field is
  absent. The report now names the real root keys and the testResults[] keys.
  It states that the five slowest figures sum assertionResults[].duration within
  each testResults[] entry. The five figures were recomputed from those fields
  and match the report. Other schema claims were checked at head cb12d6f0f:
  green_exit_code in the gate JSON files, route and phase in 36 of 37
  pre-existing role JSONs, and test_wall_seconds=90.47 in baseline.json.
  The 37th role JSON is spec-review-735a7fe.json, which has a phase but no route.
  No test or production file changed in this round.
- [x] 4.6 Report acceptance remediation F31 to F36 (3ad5dba96)
  Commit: 3ad5dba96817a803d1ad6c6bc1675c71467cc50b.
  Review log: measure/runs/www_test_audit_pilot_20261122/phase-acceptance-24733e3.log.
  Report: measure/tracks/www_test_audit_pilot_20261122/report.md.
  F31: nine files, fourteen R2 cases (`git show --name-only adf24e723`).
  F32: four slowest files unchanged; the fifth changed in 7008ccefd, 733319505
  and fb5622ed7 (`git log --oneline 635a604c8..HEAD -- <path>`).
  F33: K table now has Mutation check and Other file proofs columns. Proofs are
  credited only to the rule they break. 77 rows still sum to 2843 cases.
  F34: per-commit rows cite real GREEN and COVERAGE logs. The D5 part 2 rerun is
  green-at-7008ccef.log. Green-7008ccef.log holds an accounting plan.
  F35: F1-F3 from Review A and Acceptance are labelled with role and source.
  The workbook fix is 4d1688131, not 3b044ec9.
  F36: the timing follow-up recommendation was removed.
  F18 is recorded as approved by the PM on 2026-11-24, option A.
  No test or production file changed in this round.
- [x] 4.7 Report acceptance remediation F33 to F42 (4d8d81ffe)
  Commit: 4d8d81ffea62275fa17b84ca370a6f00cde96a9a.
  Review log: measure/runs/www_test_audit_pilot_20261122/phase-acceptance-a0b229d.log.
  Report: measure/tracks/www_test_audit_pilot_20261122/report.md.
  PM decision C: the hand-written finding history was cut. One Finding history
  section now points to the run files. It gives the JSON file counts and the
  highest finding number per role. No finding text is copied.
  F33: the blog K row credits proof-adv8.log and proof-adv11.log for the .md
  extension naming rule. Their new discovery assertions stay separate.
  F34: the log-pair table now includes 4d1688131 and bcaa97ff4 with verified
  GREEN and COVERAGE logs.
  F38: only beforeEach predates Phase 2. D5 part 2 made sectionOf and copy unused.
  F41: the loader reads exact lowercase .md only. Stricter .mdx, .MD and non-file
  checks stay separate from the parity checks for dotfiles and symlinks.
  F42: all line-number citations were replaced by section or table names.
  The lessons gained the line about hand-written evidence tables needing a script.
  No test or production file changed in this round.
- [x] 4.8 Report review remediation F43 to F45 (1e3c60d83)
  Commit: 1e3c60d83744b7efcb19d8eb09df4760e1e8112e.
  Review log: measure/runs/www_test_audit_pilot_20261122/review-a-9976626.log.
  Report: measure/tracks/www_test_audit_pilot_20261122/report.md.
  F43: Finding history held only run-file pointers and the repeated-ID notice.
  Finding-to-role maps and statuses were removed. PM-approved items point to
  plan.md Recorded deviations.
  F44: Green role result logs hold MEASURE_AGENT_RESULT; some hold a
  dispositions: line and some do not. Test-run logs hold runner output only.
  The report gives a grep command instead of a count.
  F45: GREEN logs end with the Vitest summary; COVERAGE logs end with the
  coverage table and Coverage summary block. Four log ends were read.
  Full report rescan found no other mapping, file-kind or log-ending claim.
  No test or production file changed in this round.
- [x] 4.9 Report review remediation F46 F47 (58b847e6b)
  Commit: 58b847e6b80ce4fa380c678e00c69e885d872768.
  Review log: measure/runs/www_test_audit_pilot_20261122/review-a-aeaa6a1.json.
  Report: measure/tracks/www_test_audit_pilot_20261122/report.md.
  Removed the counts of green-*.log and other run-file kinds from report.md
  and plan.md. Two counts stay in task 4.5: the dated measurements of role JSON
  files and gate JSON files at head cb12d6f0f. Those historical records name
  their head, so a later round does not change them. The report now
  defines role result logs by MEASURE_AGENT_RESULT and gives a grep command.
  Test-run logs are named by pattern. Some role logs hold dispositions and
  some do not. The names overlap, so the reader must open a file to know its kind.
  Read green-7008ccef.log: it holds an accounting-track task plan with Phase 7
  Red and Green rows, no Vitest summary and no result block. The rerun is
  green-at-7008ccef.log. Read green-5a104ba.log: it holds a result block
  without a dispositions line.
  Also removed the run-file counts and highest finding numbers from the report
  Finding history. Per-class tables still cite exact verified file names.
  No test or production file changed in this round.
- [x] 4.10 Plan wording remediation F48 (e578839dd)
  Commit: e578839ddc225fca79b7f31075141987d6ca544d.
  Review log: measure/runs/www_test_audit_pilot_20261122/review-a-01e1e9d.json.
  Task 4.9 now says it removed counts of green-*.log and other run-file kinds.
  It names the dated role-JSON and gate-JSON measurements in task 4.5 at head
  cb12d6f0f. Task 4.5 was left unchanged during the F48 round.
  Both plan.md and report.md were scanned for 'all counts', 'no count' and
  'every count'. No such phrase remains.
  No test or production file changed in this round.
- [x] 4.11 Run-file count remediation F49 (e652235f8)
  Commit: e652235f8c59c6194e8ab019e4af9dfa14276b03.
  Review log: measure/runs/www_test_audit_pilot_20261122/review-a-1fcebee.json.
  Exhaustive digit scan over plan.md and report.md found the ungated count of
  gate JSONs in task 4.5. It was dated to head cb12d6f0f, as was the role JSON
  count. The gate-JSON fact was checked over all current gate JSON files: every
  one holds green_exit_code. Tasks 4.9 and 4.10 now name both dated
  measurements, not one. Re-run of the scan found no undated count of run files.
  No test or production file changed in this round.
- [x] 4.12 Report acceptance remediation F41 F42 F50 F51 (f8964c2b9)
  Commit: f8964c2b9b9697ceab57bf1e4e742f12d78d68dd.
  Review log: measure/runs/www_test_audit_pilot_20261122/phase-acceptance-4230e12.json.
  Report: measure/tracks/www_test_audit_pilot_20261122/report.md.
  F41: a lowercase non-file .md entry keeps parity; the phase-base test failed
  with EISDIR on a directory named x.md. The .mdx and .MD checks are new.
  F42: the per-row mutation status requirement is in the spec.md Out of scope
  section, not Classes.
  F50: commit 0d705612d deleted navigation cases that checked the active locale
  through the real useCurrentLocale hook; commit 9eb3b9c4f restored the Thai
  and Chinese cases.
  F51: commit fb5622ed7 restored the explicit-English test in blog-locale.test.ts.
  The original D2 explicit-English row was not kept as a same-rule duplicate.
  All added SHAs resolved with git cat-file -e. No test or production file changed.
- [x] 4.13 Merge master into the pilot branch before final acceptance (6ee56327b)
  Commit: 6ee56327b84bd45fee1277d5da940b278ea60b26.
  Fetched origin master at 968bde612595fdcfcbadd8d7d14bafbfa8aa8b67.
  Merged origin/master as a merge commit. No rebase, no force, and no push.
  Master brings two dated blog posts, two blog images, and the 2027 home copy.
  Master also brings the storytime claims-scanner test update.
  The pilot test structure stays in the two auto-merged test and fixture files.
  Master's changed home copy stays, with the new no-roadmap-without-date test.
  APPROVED_SCHOOL_YEAR and its scanner clearing stay in the fixture.
  No production code changed here beyond what master brings.
  The four heavy-run gates passed at the merge head.
  Check-types and lint exited 0. Lint holds three pre-existing warnings.
  Vitest passed 1413 tests in 98 files. Line coverage is 92.08 percent.
  The coverage floor is 85.52 percent.
- [x] 4.14 Report master-merge label fix (152fd0f6)
  Commit: 152fd0f673471f1a28310d104a94431779d7d57f.
  Review log: measure/runs/www_test_audit_pilot_20261122/review-a-e836e72.json.
  F1: report.md labels 1412 cases and 92.07 percent as the pre-merge run at
  e91c4d4cc. It adds the master merge 6ee56327b and the final run at e836e7289
  with 1413 cases and 92.08 percent lines from green-merge-e836e7289.log.
  The cut is recomputed to 1762 cases, or 55.5 percent of the 3175 baseline.
  The coverage rise is recomputed to 5.56 points over the 86.52 percent baseline.
  The D5 step count is no longer called final. The time section compares the
  baseline with the pre-merge run and names the post-merge run apart.
  N1: task 4.13 now says auto-merged for the two files, not conflicted.
  N2: the blog merge is named for task 3.5, distinct from the master merge.
  No line citation and no count of a run-file kind was added.
  No test or production file changed. No test suite ran in this round.
  The brief subject was 101 characters. Commitlint rejects headers over 100,
  so the subject says counts instead of numbers and is 100 characters.
  No --no-verify was used. No push was made.
