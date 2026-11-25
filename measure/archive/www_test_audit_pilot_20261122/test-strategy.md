# Test strategy: www test audit pilot

> **Track:** `www_test_audit_pilot_20261122` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Branch:** `www/test-audit` in `/home/daniebo/Desktop/rama-worktrees/www-test-audit`
> **role_base_sha:** `2e7fb87`, verified with `git rev-parse HEAD` before this file was committed. It is the branch start. It is not `phase_base_sha`.
> **Writer:** measure-strategy, Phase 1. This file covers Phases 1 to 4.
> **Source:** PM plan A-66 sections 3 to 7, the accepted role note in `plan.md`, and the spec review at `measure/runs/www_test_audit_pilot_20261122/spec-review-735a7fe.json`.

This track changes test files only. It changes no production file. It makes no push before phase acceptance. The suite under audit is the Vitest suite of `www-reading-advantage`.

`build-graph` is on PATH. `graph.db` is absent. The track changes no exported product symbol. Graph inspection is not a phase gate.

## 1. Rules for every phase

### 1.1 Capture of `phase_base_sha`

Capture point: the orchestrator commits this file alone with a pathspec commit. It then runs `git rev-parse HEAD` in this worktree. The printed value is the immutable `phase_base_sha`. That value is the strategy commit itself.

Do not use `2e7fb87` as `phase_base_sha`. That SHA predates the strategy commit. Do not write any SHA into this file. Do not change the captured value after capture. Each later phase records its own base from the previous phase checkpoint in `plan.md`. This file names no SHA for those bases.

### 1.2 Gate commands

Set `HEAVY_PREFLIGHT_WAIT_S=3600`. Run both commands through the shared runner. Run one heavy job at a time. The strategy role does not run these commands.

GREEN_TEST_COMMAND (also the Phase 1 baseline command):

```text
HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'CI=true pnpm --filter www-reading-advantage exec vitest run --maxWorkers=1 --reporter=dot'
```

COVERAGE_COMMAND:

```text
HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'pnpm --filter www-reading-advantage test:coverage'
```

A GREEN run must exit 0 and keep a log. A COVERAGE run must keep a log with a labeled line coverage value. The orchestrator compares that value to the Phase 1 baseline under the rule of spec section 6(b). A run without a log is `not-run`, not a pass.

### 1.3 Evidence classes

- **Artifact test:** reads a file and checks its text. `classification.md`, `baseline.json`, `second-check-*.json`, and `report.md` are artifacts.
- **Live behavior test:** runs a command and records its exit code and log. GREEN and COVERAGE runs are live behavior. A breakage proof is live behavior.
- An artifact test does not close spec section 6(a), 6(b), or 6(c). Only the live logs close those criteria.
- A plan note that says "pass" must name the exit code and the log path it cites.

### 1.4 Intentionally-red aggregate suites

The root `pnpm turbo run test` is not a gate of this track. It is red for faults that predate the track. Do not claim it passes. Do not quote its exit code as a phase result.

The full suites of other apps are not gates. The known baselines in `AGENTS.md` and `measure/tech-debt.md` stay as they are. Do not edit them in this track.

The scoped www command is the only test gate. A red www baseline stops Phase 1 before any classification is trusted. A later red www run belongs to the last class commit. Do not relabel a www failure as `predates-track` without a base log that names the same failing test. Add no `## skip-aggregate:` header, because this track adds no new test file.

### 1.5 Worktree deviation (A16)

The orchestrator assigned this worktree. Roles write only here. Do not add another worktree. Do not write in the main checkout. Do not use the A16 one-worktree check to fail this assigned worktree.

### 1.6 Red and Green deviation

The accepted role note changes the TDD order. `measure-mid-red` writes no failing test in Phase 1. Phases 2 and 3 have no Red test. The deletion or the rewrite is the change. `measure-jr-green` makes every Phase 2 and Phase 3 commit. The orchestrator runs the substituted Red gate and the Green gate below. Every substituted gate keeps a falsification condition.

## 2. Phase summary

| Phase | Risk | Review A | Review B | Review C | Adversarial | Browser / UX | Security review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 Baseline and classification | high | yes | no | no | yes, bounded | no | no |
| P2 Delete batch (D1-D5) | critical | yes | no | no | yes, bounded | no | no |
| P3 Rewrite batch (R1-R3) | high | yes | no | no | yes, bounded | no | no |
| P4 Pilot report | medium | yes, artifact only | no | no | no | no | no |

Risk reasons:

- P1 is high because a wrong row in `classification.md` drives every later deletion.
- P2 is critical because a deleted K test can remove the only check of a money, payout, access, or data rule. This pilot ships no Stryker run and no mutation baseline. Coverage alone cannot prove fault detection.
- P3 is high because a rewrite can pass while it tests a fake or drops the behavior it claimed to keep.
- P4 is medium because a false claim in the report can close acceptance without live proof.

## 3. Review applicability

| Review | Applies | Reason |
| --- | --- | --- |
| Review A (`measure-review-a-correctness`) | yes | It checks the fidelity rule, the class of every row, the K list, the named duplicates, the per-class commit scope, and the log-to-claim link. In P4 it checks artifact completeness only. |
| Review B (`measure-review-b-security`) | no | No production code changes. No route, auth, permission, secret, SQL, or provider surface changes. A deleted access test is a test-coverage defect, not a production security defect. Review A, the K list, and adversarial testing hold that control. |
| Review C (`measure-review-c-ux-api`) | no | No route, handler, schema, component, or response shape changes. The plan note says Reviews A and C run as usual; if the orchestrator schedules Review C, its only meaningful assertion is that no production file changed. |
| UX browser (`measure-ux-browser-review`) | no | No rendered surface changes. The Playwright files are classified but not run as a gate. No WebBridge evidence is needed. |
| Adversarial (`measure-adversarial-testing`) | yes, bounded for P1 to P3 | The attack surface is a mislabeled K test, a weak rewrite that passes, a duplicate that does not keep the rule, and a coverage claim from an unlabeled digit. No attack writes production code or exploits a live service. |
| Security review (standalone) | no | The track owns no security control. It preserves existing test proof for money, payout, access, and data. |

## 4. Shared anti-pattern defenses

| ID | Defense | Falsification condition |
| --- | --- | --- |
| A1 | A class is an enum value in a column. A row never takes its class from a file name or a prose substring. | A file named `*.red.test.ts` or `*.adversarial.test.ts` is classified without a fidelity reason, and the check passes. |
| A2 | No publish gate exists in this track. No push before acceptance. | A gate treats a report as published, or a role pushes. |
| A3 | Counts and coverage use labels: `case_count=`, `line_coverage_pct=`, `delta_pct=`, `cases_before=`, `cases_after=`, `rule=`, `breakage_exit=`. A check parses the value after the label. | A check passes on any digit, a date, or a year. |
| A4 | An empty classification, an empty deletion set for a class commit, and an empty breakage-proof set fail. | A phase passes with no classified row, no deleted case, or no breakage proof. |
| A5 | A `pass` row needs exit 0 and a matching log. The plan quotes the code and the path. | The plan says "all checks pass" while a cited command exits non-zero. |
| A6 | `measure/tracks.md` may say the audit passed only after phase acceptance. This role does not edit the registry. | The registry says fault detection is kept while a coverage log is red. |
| A7 | The K list is an explicit path pattern list. The deletion filter is the class column. No filter uses bare English words. | A broad word filter drops a payout file outside `tutor-commission*`, or keeps a marketing doc test. |
| A8 | The plan keeps the markers `[ ]`, `[~]`, `[x]`, and `[b]`. This role does not edit `plan.md`. | A new task uses a space inside the marker. |
| A9 | Artifacts reference the active track directory. No row cites `measure/archive/` for this track. | A row or a report path points at an archived copy while the active directory exists. |
| A10 | The track changes no exported product symbol and no generated fact. Do not run `measure/generate.sh` for a test-file diff. | A phase adds an exported function and skips the graph update. |
| A11 | Not applicable. This is not a review-execution track. A blocked marker is never a placeholder. | A task uses `[b] deferred:review-execution` after review artifacts exist. |
| A12 | No new `Guard:` reference is added to the anti-pattern catalog. | A catalog line names a guard file that does not exist. |
| A13 | Not applicable. No track directory moves in this track. | A stale `measure/tracks/` copy remains after an archive move. |
| A14 | Any detector command uses `rg -n '<regex>'`, never `rg -nE`. Exit code 2 fails. | A detector reports zero hits with exit code 2. |
| A15 | No new hash or checksum field is added to a receipt, a baseline, or the report. Provenance is a Git commit and a log path. | A new SHA-256 field appears in a track file. |
| A16 | See section 1.5. | A role creates a second worktree for this track. |

## 5. Fixtures, mocks, and live-behavior proof

- No new fixture and no new dependency is needed for the deletion commits.
- An R1 rewrite may use a boundary fake for DB or network. It must not mock the code under test. A test of the mock fails Review A.
- An R2 rewrite may use a fixed clock and role-based selectors. It must not assert on CSS classes or call order.
- A D5 replacement checks that a locale key exists in every declared locale. The locale list is explicit. A missing key fails the test.
- The breakage proof mutates a temporary copy of the module under test. It never mutates a production file.
- Green stores the GREEN log and the COVERAGE log under `measure/runs/www_test_audit_pilot_20261122/` for each class commit. The plan names each log path.
- A report sentence is not live proof. A K-row claim in `report.md` needs the per-commit logs and the kept duplicate named in `classification.md`.

## 6. Architecture guardrails and changed-contract risks

- Allowed changed paths are test files under `apps/www-reading-advantage` only. A diff that names a non-test file under `apps/` fails the phase gate.
- No new package import. The spec review found only `@reading-advantage/ui`, `utils`, and `config`. A rewrite that imports a core module fails Review A.
- K rows cover money and payout (`tutor-commission*` files), access, student data, and data migration. No K row is deleted without a named duplicate that keeps the same rule. The duplicate names the rule in its row.
- The case-count target of spec section 6(a) and the coverage limit of spec section 6(b) come from the baseline logs, not from prose. A count in a plan or a report is a label with a source log path.
- A coverage fall within the rule can still hide a lost rule. Review A checks each deleted row against the fidelity rule of spec section 4.
- A rename can turn a D-class row into a K-class row. A rename that changes the tested rule fails Review A.

## 7. Phase 1: Baseline and classification

**Risk:** high.

### Targeted Red command (substituted gate)

At the base, `classification.md`, `baseline.json`, and `baseline.log` do not exist. The check fails. After `measure-mid-red`, all three exist and no file under `apps/` changed. The orchestrator runs the check with `RED_TEST_COMMAND` unset.

```bash
git diff --name-only <phase_base_sha> HEAD -- apps/
test -s measure/tracks/www_test_audit_pilot_20261122/classification.md
test -s measure/runs/www_test_audit_pilot_20261122/baseline.json
test -s measure/runs/www_test_audit_pilot_20261122/baseline.log
```

Expected Red: the `test -s` commands fail. Expected Green: the diff is empty and every `test -s` exits 0.

### Green gate

1. The baseline GREEN run and COVERAGE run exit 0 and keep logs.
2. `baseline.json` holds `case_count=<n>` and `line_coverage_pct=<n>` with the two log paths.
3. Every www test file has one row in `classification.md`. A mixed file has one row per case.
4. K rows appear first. Every `e2e/*.spec.ts` file has a row marked not counted.
5. The second check names an output file and a `.log`. Its disagreement verdict cites the stop rule of plan task 1.3.
6. No file under `apps/` changed.

### Closeout gate

Green gate, then Review A, then the bounded adversarial pass, then phase acceptance. The second-check artifact must exist. A disagreement above the stop rule of plan task 1.3 halts the track for a rubric fix.

### Anti-pattern coverage

| ID | Defense in this phase | Falsification condition |
| --- | --- | --- |
| A1 | A class comes from the fidelity reason in spec section 4, not from a file name. | A `.red.test.ts` file is called D3 with no reason and the check passes. |
| A3 | `baseline.json` uses labeled integers. A parser reads the value after each label. | A date or a year in the log satisfies `case_count=`. |
| A4 | Zero rows and a zero-row second check fail. | An empty `classification.md` passes the gate. |
| A5 | A pass claim names the exit code and the log path. | The plan says the suite passes with no log. |
| A7 | K rows use explicit path patterns. No word filter decides a class. | A word filter drops a payout row from the K list. |
| A9 | Artifact paths use the active track directory. | A row cites `measure/archive/www_test_audit_pilot_20261122/`. |
| A14 | Any detector uses `rg -n` and treats exit 2 as failure. | A detector reports no hits with exit 2. |
| A16 | See section 1.5. | A role creates a second worktree. |

## 8. Phase 2: Delete batch (D1-D5)

**Risk:** critical.

### Targeted Red command (substituted gate)

The GREEN baseline run at the phase base must exit 0 before a deletion commit. The deletion-set check runs on each class commit. A deleted path must match a D-class row of that commit. A deleted path must not match any K row.

```bash
git diff --name-only --diff-filter=D <previous_commit> HEAD -- apps/www-reading-advantage
```

Expected Red: the base has no class commit and no deletion log, so the gate fails. Expected Green: the listed paths are a subset of that class's D rows, and the intersection with K paths is empty.

### Green gate (after every class commit)

1. GREEN exits 0. COVERAGE keeps a log. The coverage fall stays under the rule of spec section 6(b).
2. The commit holds one class only. The plan task line names the commit SHA and both log paths.
3. The deletion set matches the class rows in `classification.md`. No K row is deleted.
4. A K row that names a duplicate keeps the duplicate path and the rule text.
5. No non-test file under `apps/` changed.

### Closeout gate

Green gate for every class commit, then Review A, then the bounded adversarial pass, then the Phase 2 checkpoint. A failed class commit is reverted by a new commit for that class only. No reset and no stash.

### Adversarial attack cases

- Relabel a `tutor-commission*` K row as D1. The deletion-set check must fail.
- Delete a D4 row that is the only behavioral check of a payout rule. Review A must reject the row, and the coverage log alone must not close the gap.
- Classify an `e2e/*.spec.ts` file as counted. The classification gate must fail.

### Anti-pattern coverage

| ID | Defense in this phase | Falsification condition |
| --- | --- | --- |
| A1 | The deletion set comes from the class column, not from a name substring. | A file with "red" in its name but a K row is deleted. |
| A3 | `cases_before=`, `cases_after=`, and `line_coverage_pct=` carry labels and log paths. | The reduction claim passes on any digit in a log. |
| A4 | An empty deletion set for a class commit fails. | A D1 commit with no deleted case passes. |
| A5 | Every gate row names exit 0 and a log. | A task line says pass while its GREEN log exits non-zero. |
| A6 | The registry says nothing about fault detection until acceptance. | `tracks.md` claims the audit passed after one class commit. |
| A7 | The deletion filter is the explicit class list. | A filter on the word "duplicate" deletes a D2 row outside the set. |
| A8 | The plan uses the accepted markers. | A task uses `[?]` for a class commit. |
| A9/A14/A16 | As in section 7. | As in section 7. |

## 9. Phase 3: Rewrite batch (R1-R3)

**Risk:** high.

### Targeted Red command (substituted gate)

Before each rewrite commit, the GREEN baseline run must exit 0. Each rewritten class must carry one labeled breakage proof. The proof neutralizes the named rule in a temporary copy and shows the rewritten test fail.

```bash
git diff --name-only <previous_commit> HEAD -- apps/www-reading-advantage
```

Expected Red: no breakage proof exists at the base, so the gate fails. Expected Green: the proof holds `rule=<id> breakage_exit=<nonzero> log=<path>` for each rewritten class, and only R-class files changed.

### Green gate (after every class commit)

1. GREEN exits 0. COVERAGE keeps a log. The coverage fall stays under the rule of spec section 6(b).
2. The commit holds one rewrite class only. The plan task line names the SHA and both log paths.
3. Every R1 rewrite uses a boundary fake, never a mock of the code under test.
4. Every R2 rewrite uses a fixed clock and role-based selectors.
5. Every R3 split or rename keeps the named rule and adds a breakage proof.
6. No non-test file under `apps/` changed. No K row is deleted or weakened.

### Closeout gate

Green gate for every class commit, then Review A, then the bounded adversarial pass, then the Phase 3 checkpoint. A rewrite that passes without a breakage proof stays open.

### Anti-pattern coverage

| ID | Defense in this phase | Falsification condition |
| --- | --- | --- |
| A1 | The breakage proof is a labeled exit code, not a test name that contains "fixed". | A renamed test passes as proof without a breakage run. |
| A3 | `rule=`, `breakage_exit=`, and `line_coverage_pct=` are parsed after their labels. | A proof passes on any digit in the log. |
| A4 | A rewrite with no behavioral assertion fails. A mock-only assertion fails. | An R1 rewrite that asserts only `toHaveBeenCalled` passes. |
| A5 | A pass row needs exit 0 and a log. | A plan row says all tests pass with no GREEN log. |
| A7 | A D5 locale check uses an explicit locale list. No word filter excludes a locale. | A filter that contains "never" drops a missing-locale case. |
| A9/A14/A16 | As in section 7. | As in section 7. |

## 10. Phase 4: Pilot report

**Risk:** medium.

### Targeted Red command (substituted gate)

At the base, `report.md` does not exist. The check fails.

```bash
test -s measure/tracks/www_test_audit_pilot_20261122/report.md
```

Expected Red: exit non-zero. Expected Green: exit 0 with every required section present.

### Green gate

1. The report lists what went, what changed, and why, under the rule of spec section 6(f).
2. It lists each per-class commit and each per-commit GREEN and COVERAGE log.
3. It lists each K row kept and the duplicate that keeps the rule.
4. It records CI test time before and after from the runner logs.
5. It names each K row that has no mutation check, under spec section 3.

### Closeout gate

Green gate, then Review A as an artifact check, then track acceptance. No browser review and no adversarial pass. No push belongs to this phase.

### Anti-pattern coverage

| ID | Defense in this phase | Falsification condition |
| --- | --- | --- |
| A3 | CI durations use labels such as `ci_seconds_before=` and `ci_seconds_after=` with log paths. | A duration claim passes on any digit in a report. |
| A4 | An empty report, or a report with no K section, fails. | A report with one heading passes acceptance. |
| A5 | Every claim cites exit codes and log paths. | The report says the criteria pass while a cited log exits non-zero. |
| A6 | The report says "locally recorded, not pushed" until acceptance. | The registry or the report claims a push before acceptance. |
| A15 | No hash field is added to the report. | A new SHA-256 field appears. |
| A10/A11/A13 | As in section 4. | As in section 4. |

## 11. Phase acceptance checks

- `phase_base_sha` was captured after the strategy commit and before the Phase 1 Red gate. It is recorded in the plan.
- The baseline logs and `baseline.json` exist with labeled values.
- The case-count reduction and the coverage fall come from the logs under the rules of spec section 6(a) and 6(b).
- Every class commit holds one class, exits 0 on GREEN, and keeps a COVERAGE log.
- No K row is deleted without a named duplicate. No non-test file under `apps/` changed.
- The second-check artifact exists and respects the stop rule of plan task 1.3.
- The report holds the required sections and the before-and-after CI durations.
- Review A records no open critical or high defect. Review B, Review C, and browser review are not applicable under section 3.
- No push was made before acceptance.
