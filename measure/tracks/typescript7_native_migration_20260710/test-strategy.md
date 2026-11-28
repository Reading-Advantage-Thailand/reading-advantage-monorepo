# Test Strategy: TypeScript 7 Native Compiler Migration (one-compiler design)

Revision: 2026-11-05 amendment. role_base_sha: `0daf3547808319142ae02a3f62d61c3c7aed78c4` (the
commit that rewrote `spec.md` and `plan.md`). Author model: claude-code/claude-sonnet-5-5.

This strategy covers the amended plan: Phase 2 (vinext 1.x), Phase 3 (TypeScript 7 trial), Phase 4
(Cloudflare preparation), and Phase 5 (gated rollout). Phase 2 has the full section. Phases 3 and 4
have outlines. The full sections come before each phase starts. Phase 5 waits for Daniel.

Revision 2026-11-28 (Phase 3, first task). Author model: claude-code/claude-sonnet-5-5. The strategy
role started from `190c38252` (origin/master). That value is not the `phase_base_sha` (sections 2 and 5a.4).
Section 5a is new: the full section for the first Phase 3 task. Sections 1, 5, and 8 changed. The
other Phase 3 tasks keep an outline in section 5; each gets its own strategy round later.

## Contents

- [Superseded history](#superseded-history-2026-11-05)
- [1. Constraints for every phase](#1-constraints-for-every-phase)
- [2. phase_base_sha capture point](#2-phase_base_sha-capture-point)
- [3. Anti-pattern vocabulary used here](#3-anti-pattern-vocabulary-used-here)
- [4. Phase 2: vinext 1.x upgrade (full section)](#4-phase-2-vinext-1x-upgrade-pm-step-0)
- [5. Phase 3 outline](#5-phase-3-outline-typescript-7-trial)
- [5a. Phase 3 Task 1: vinext 1.4.6 (full section)](#5a-phase-3-task-1-bump-vinext-to-146)
- [6. Phase 4 outline](#6-phase-4-outline-cloudflare-preparation)
- [7. Phase 5 note](#7-phase-5-note-gated-rollout)
- [8. Open questions and defaults](#8-open-questions-and-defaults)

## Superseded history (2026-11-05)

The earlier version of this file (734 lines) described a dual-compiler design. It paired
TypeScript 6 with TypeScript 7 through catalog aliases. It also defined a diagnostic parity
ledger, a compatibility command set, and a TypeScript 6 oracle. On 2026-11-05 Daniel chose one
compiler. The TypeScript 6 oracle no longer exists. Therefore all of that content is superseded.

This file keeps a one-paragraph summary and not the full text. Reason: the old rules contradict
the new design, and a role that reads both could apply a rule that no longer holds. Git keeps the
full text. Run `git show 0daf35478:measure/tracks/typescript7_native_migration_20260710/test-strategy.md`
to read it. Treat it as history only.

Two ideas from the old file stay valid and appear again below: a fail-closed measurement (a
faster run with missing diagnostics is a failed measurement), and the resource signals for a
constrained host (peak RSS, wall time, swap delta, and OOM exit codes).

## 1. Constraints for every phase

| Constraint | Rule |
| --- | --- |
| Heavy steps | Run each through `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'`. Run one at a time. |
| What is heavy | Any command that starts `pnpm`, `vitest`, `vinext`, `tsc`, or a browser. A heavy step also includes `pnpm install`. |
| What is light | A Python unit test that reads files, `git` read commands, `rg`, and `curl` reads of the npm registry. Light steps may run at any time. |
| Time window | **Lifted 2026-11-28** (PM, 07:35). Phase 2 ran after 22:00 ICT. Phase 3 and later run at any hour. `heavy-run.sh` holds the lock, so the rule is: one heavy step at a time. |
| Storytime priority | Run every heavy step at `HEAVY_PRIORITY=p2`. Do not raise it to `p1`. If `heavy-run.sh` names a holder, wait. Do not start a second heavy job beside it. |
| Memory | The machine has 7 GB of memory. Run vitest with `--maxWorkers=1`. Run no second heavy job at the same time. |
| Pipes | A heavy command that pipes to `tee` starts with `set -o pipefail;`. Without it the exit code of the tool is lost. |
| No push, no deploy | This holds for every phase. A deploy command or a `git push` in any gate is a failure. |
| No new hash | Add no hash field, checksum, or manifest hash (AGENTS.md hashing policy). Lockfile integrity lines are normal lockfile content and are not new fields. |
| Staging | The repository has many untracked files from other sessions. Every commit names its paths. A Storytime role commits on master at the same time. |
| Worktrees | Phases 2 and 4 use the shared master tree only (A16). Phase 3 uses worktrees: one for each Green round, and one trial worktree. The main checkout holds uncommitted owner edits, so no role works in it. See section 8, questions 2 and 10. |
| Heavy job cap | A p2 job stops at 1800 s (`maxLockSecondsP2`, exit 124). Each gate is its own job and must finish under the cap. A gate that hits the cap splits. Do not raise the priority. |

## 2. phase_base_sha capture point

The strategy commit is the point where Phase 2 starts. The orchestrator captures the immutable
`phase_base_sha` in this order:

1. The strategy commit lands on master.
2. The orchestrator runs
   `git log -1 --format=%H -- measure/tracks/typescript7_native_migration_20260710/test-strategy.md`.
3. The output is the `phase_base_sha`. The orchestrator writes it into the prompt of Mid Red.

Do not use `git rev-parse HEAD` for this value. A Storytime role commits on master at the same
time, so HEAD can move before the capture. This file holds no SHA, so a later edit cannot
invalidate it. Every later diff for this phase uses a pathspec or a named commit list. A plain
`git diff phase_base_sha..HEAD` would include the Storytime commits.

## 3. Anti-pattern vocabulary used here

Source: `measure/anti-patterns.md`. The list names the entries that matter for this track.

| ID | Meaning in this track | Standing defense |
| --- | --- | --- |
| A3 | A digit is not a labeled count. | Parse labeled integers (`Tests  12 passed`, `Test Files  5 passed`). Do not match a bare `[0-9]+`. |
| A4 | A pass with nothing done. | Every check needs a non-zero minimum (rows, files, tests, lock entries). An empty list fails. |
| A5 | Claim text differs from test reality. | A note cites a command, an exit code, and a log. A test recomputes the claim from the source. |
| A6 | A registry or plan note overstates. | `plan.md` and `tracks.md` say "upgraded" only after the phase gate exits 0. |
| A7 | A filter drops real hits. | Compare failures by test file and test name. Do not drop log lines with bare words such as "never" or "warn". |
| A8 | The `[ ]` marker is ambiguous. | The plan uses `[ ]` for Phase 2 to 4 tasks. The plan-update step must set `[~]` before Mid Red (see section 8, question 5). |
| A9 | A test reads an archived track path. | The Python tests resolve the track folder with `track_dir_resolve` (archive first, then `tracks`). |
| A14 | `rg -nE` makes a detector fail. | Use `rg -n`. Treat `rg` exit code 2 as a failed detector. Exit 1 with no output means zero hits. |
| A16 | One shared master tree. | No worktree in Phases 2 and 4. Phase 3 needs a recorded exception. |

A1, A2, A10, A11, A12, A13, and A15 do not apply: this track has no supervisor heuristic, no
publish gate, no generated Measure facts, no review track, no archive move, and no role receipt
that lists file hashes.

## 4. Phase 2: vinext 1.x upgrade (PM step 0)

Scope: `apps/marketing` and `apps/activity-vinext-fixture` move from vinext 0.2.0 to vinext 1.x.
The change touches the two `package.json` files and the lockfile entries that follow.

### 4.1 Facts observed at strategy time (2026-11-05, read-only)

These facts are inputs. Task 1 must re-verify each one and record the result.

| Fact | Value | Source |
| --- | --- | --- |
| Current declared version | `vinext` 0.2.0 in both apps | `apps/marketing/package.json:24`, `apps/activity-vinext-fixture/package.json:12` |
| Latest 1.x | 1.4.3 (2026-11-03) | npm registry |
| 1.4.3 peers | `vite ^8.0.0`, `react ^19.3.1`, `react-dom ^19.3.1`, `@vitejs/plugin-react ^5.1.4 \|\| ^6.0.0`, `@vitejs/plugin-rsc ^0.5.37` (optional), node `>=22` | npm registry |
| Repo values | React 19.2.9 (`pnpm-workspace.yaml:119`, `overrides.react`, and 13 app manifests); Vite 8.1.6 (`pnpm-workspace.yaml:122`); plugin-react 6.0.3 (`:126`); plugin-rsc 0.5.27 in the lockfile; Node 22.22.3 | `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `node --version` |
| React peer change | The peer moved from `^19.2.6` to `^19.3.1` in vinext 1.2.1 (2026-10-15). vinext 1.2.0 still asks for `^19.2.6`. | npm registry, version list |
| Shim and CLI paths | `dist/cli.js` and the six `dist/shims/*.js` files that `apps/marketing/vitest.config.ts` uses exist in 0.2.0, 1.2.0, and 1.4.3. | jsDelivr file lists |
| New transitive packages | 1.x adds `@vinext/types` and `vite-plugin-commonjs`. It drops the `vite-tsconfig-paths` peer. | npm registry |

**Expected result of Task 1: the React peer is "not met" for 1.4.3.** React 19.2.9 does not satisfy
`^19.3.1`. React is pinned for the whole repository by `overrides.react` in
`pnpm-workspace.yaml`. A React change would touch 13 apps and several packages. That breaks
FR-2 ("keep the change to these two apps") and is a framework upgrade that AGENTS.md forbids
inside unrelated work. The plan already says: if any range is "not met", Task 1 stops and asks
the PM before Task 2. This strategy keeps that rule. Section 8 (question 1) holds the options and
the default.

The Vite major does not change (Vite 8 stays Vite 8). The Node range is met.

### 4.2 Risk classification

| Task | Risk | Reason |
| --- | --- | --- |
| 1. Peer check | low | Read-only research. It is decision-critical, because it decides if Task 2 starts. |
| 2. Upgrade | medium | A 0.x to 1.x change of the server framework of an app with an auth boundary. It adds transitive packages and edits the lockfile under a `hoisted` linker. It becomes **high** if the PM chooses a repo-wide React change. A high result needs a new strategy before Red. |
| 3. Record result | low | A note only. It feeds the Phase 3 baseline for two workspaces. |
| Phase | **medium** | |

### 4.3 Test files that Red writes

Red writes exactly one new file: `measure/tests/test_typescript7_native_migration_phase2.py`.
It uses the Python standard library only. It does not extend
`test_typescript7_native_migration_phase1.py` (history, per `spec.md`). It adds no Node
dependency and no hash.

Red also creates no evidence note. The note is Green output. A missing note is the expected
Red failure for Task 1.

Shared helpers inside the file:

- `track_dir_resolve()`: archive folder first, then `measure/tracks/` (A9).
- `satisfies(version, range)`: a checker for three forms only: caret (`^`), `>=`, and `||`.
  It follows the npm caret rule (`^0.5.37` means `>=0.5.37 <0.6.0`). Any other form, and any
  version that has a `-` pre-release part, raises `UnsupportedRange`. The test then fails. It
  never passes by default (A4).
- `resolve_installed(app, package)`: read `apps/<app>/node_modules/<package>/package.json`, then
  the root `node_modules`. This follows Node resolution under the `hoisted` linker.
- `parse_note_blocks()`: read the fenced JSON blocks named `peer-check`, `resolved-after`, and
  `gate-results` from `evidence/phase2-vinext-peer-check.md`.

Test classes and their falsification conditions:

| Class and test | State at base | What it proves | Falsification (how a broken copy fails it) |
| --- | --- | --- | --- |
| `P2CheckerTests` (5 tests) | green (guard) | The range checker is correct: `^19.3.1` vs `19.2.9` is "not met"; `^0.5.37` vs `0.5.27` is "not met"; `^5.1.4 \|\| ^6.0.0` vs `6.0.3` is "met"; `>=22` vs `22.22.3` is "met"; `~1.2` raises `UnsupportedRange`. | Change the caret rule in the helper: at least one case fails. |
| `P2T1PeerNoteTests.test_note_exists_and_parses` | red (note missing) | The note exists. The `peer-check` block parses and has the keys `checked_on`, `vinext_candidate`, `registry_command`, `registry_peers`, `registry_engines`, `rows`, `overall`, `decision`. | Delete the note, or drop one key: fail. |
| `...test_candidate_is_stable_1x` | red | `vinext_candidate` matches `^1\.\d+\.\d+$`. A pre-release such as `1.0.0-beta.13` fails. | Set the candidate to `0.2.0` or a beta: fail. |
| `...test_rows_cover_every_registry_peer` | red | Every key in `registry_peers` has a row, and a `node` row exists. `len(rows) >= 6` (A3, A4). | Remove one row or empty the list: fail. |
| `...test_verdicts_recomputed` | red | For each row, `satisfies(repo_value, range)` equals the stated verdict. | Flip one verdict: fail. |
| `...test_repo_values_are_cited` | red | `repo_source` has the form `path:line`. That line contains `repo_value`. The form `cmd:<command>` is allowed for `node` only. | Cite a wrong line: fail (A5). |
| `...test_decision_follows_verdicts` | red | A blocking "not met" row gives `overall: "not met"` and `decision: "stop-ask-pm"`. All "met" gives `overall: "met"`. A peer is blocking when it is not optional, or when it is optional and installed. | Write `proceed` next to a "not met" row: fail (A5, A6). |
| `P2T2DeclarationTests.test_both_apps_declare_candidate` | red | Both apps declare the same exact version. It equals `vinext_candidate` and its major is 1. The value has no `^` or `~`. | Leave one app at 0.2.0: fail. |
| `...test_lock_importers` | red | The lockfile has exactly 2 importer entries named `vinext` (the line `      vinext:` followed by `specifier:` and `version:`). Both `specifier` values equal the candidate. Both `version` values start with the candidate. | Edit one specifier: fail. A count other than 2 fails (A3). |
| `...test_lock_has_no_old_version` | red | The text `vinext@0.2.0` appears 0 times in `pnpm-lock.yaml`, and `vinext@<candidate>` appears at least once as a package key. | Keep one old entry: fail. |
| `...test_installed_matches_declared` | red | `node_modules/vinext/package.json` (app first, then root) has the declared version. | Skip the install: fail. |
| `P2T2PeerGuardTests.test_installed_peers_satisfied` | green at base (guard) | For each app, every peer in the installed vinext `peerDependencies` is satisfied by the installed package. It checks `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, and `@vitejs/plugin-rsc`. Optional peers that are absent are skipped and listed. Node uses `node --version`. | Install 1.4.3 under React 19.2.9: fail. This is the decisive refutation of a peer violation. |
| `...test_hardcoded_vinext_paths_exist` | green at base (guard) | Each path of the form `vinext/dist/...` found in `apps/marketing/vitest.config.ts`, `apps/marketing/Dockerfile`, and `apps/marketing/scripts/verify-vinext-runtime.mjs` exists in the installed package. A path without an extension may match `<path>.js`. At least 7 distinct paths are found (A4). | Point one alias at a missing shim: fail. |
| `P2T2ScopeTests.test_green_commits_in_scope` | red (env unset) | The environment variable `P2_GREEN_COMMITS` lists the Green commits. Each commit touches only: the two app folders, `pnpm-lock.yaml`, the evidence folder of this track, and `plan.md` of this track. The test **fails** when the variable is unset or empty (A4). A touched app file other than `package.json` needs an `app_changes_justified` entry in the note with a build log reference. **Amended 2026-11-06: the allowed paths and the commit list are in 4.12.2.** | Add a stray file to a scratch commit: fail. |
| `...test_lock_diff_in_scope` | red (env unset) | In the Green commits, each lockfile change is inside the importer blocks of the two apps, or inside the `packages:` and `snapshots:` sections. Another importer block must not change. | Edit another app's importer block: fail. |
| `P2T3ResolvedNoteTests.test_resolved_after_matches_disk` | red | The `resolved-after` block gives `vinext`, `vite`, and `react`. Each value equals the version on disk. `reproduce_commands` is exactly `["pnpm why vinext", "pnpm why vite"]`. | Edit a version in the note: fail. |
| `...test_gate_results_complete` | red | The `gate-results` block has one entry for each gate id in section 4.6. Each entry has `command`, `exit`, `log`, and `start_epoch`. Each `exit` is 0. Each log exists and is not empty. | Remove an entry or log: fail. |
| `...test_counts_match_logs` | red | The vitest counts in the note equal the labeled lines in the raw logs (`Test Files  N passed`, `Tests  M passed`). The post-upgrade file count equals the baseline file count. The post-upgrade passed count is at least the baseline passed count. Failures after are a subset of failures before, compared by test file and name (A3, A7). | Change one count in the note, or drop a test file from the run: fail. |
| `...test_warning_counts_match_logs` | red | For each build log, `warning_line_count` equals the number of lines that match `(?i)warn`. The test uses the whole log and no pre-filter (A7). | Edit the log or the count: fail. |

Count at base: 23 tests. These are 5 checker tests, 6 note tests, 4 declaration tests, 2 guards,
2 scope tests, and 4 result tests. 16 fail at base and 7 pass (the checker tests and the two
guards). Red may split a row into more tests. A missing note must make a test **fail** with
`self.fail(...)`. It must not raise an exception. The Red run must show a failure count above 0
and an error count of 0. An error (for example `ImportError` or `SyntaxError`) means a broken
test and not a valid Red.

### 4.4 Targeted Red command

```
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \
  measure.tests.test_typescript7_native_migration_phase2
```

This command is light. It exits non-zero at base. Expected output: `FAILED (failures=N)` with
`N = 16`, and no `errors=` part. Red parses the labeled integer (A3). Red lists which tests
passed at base (the `P2CheckerTests` class and the two guards in `P2T2PeerGuardTests`). Any
failing test must fail because the note is missing, the version is 0.2.0, or the environment
variable is unset. It must not fail for another reason.

### 4.5 Order of work and decision gate

1. **Red** (light). Commit the test file. The orchestrator sets task 1 to `[~]` first (A8).
2. **Task 1 Green** (light: registry reads and a file write). Write the `peer-check` block.
   Command: `npm view vinext@<v> peerDependencies engines --json` for the candidate and for
   each older 1.x that the note considers. `npm view` only reads the registry.
3. **Gate G2.1**:
   `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase2.P2CheckerTests measure.tests.test_typescript7_native_migration_phase2.P2T1PeerNoteTests`
   exits 0. This gate checks that the note is **true**. It does not require the verdict "met".
4. **Decision point.** If `overall` is "met", go to step 5. If `overall` is "not met", Task 1
   ends with `status: blocked`. The orchestrator asks the PM (section 8, question 1). Tasks 2 and 3
   do not start until the PM answers.
5. **Baseline run H0** (heavy; before any install). See section 4.6.
6. **Task 2 Green** (heavy). Edit the two `package.json` files and refresh the lockfile.
   Before the install, read the active release-age policy through `heavy-run.sh` (the command
   starts `pnpm`): `pnpm config get minimum-release-age`. The workspace file sets no value, so the pnpm default
   applies. vinext 1.4.3 is two days old on 2026-11-05. If the install fails with a "no mature
   matching version" error, stop. The fix is an edit of `pnpm-workspace.yaml`, which is outside
   the allowed paths. Ask the PM, or wait until the version is old enough. Do not widen the scope.
   Do not add a `minimumReleaseAgeExclude` entry without PM approval.
7. **Task 3 Green** (light after the heavy post-run). Write the `resolved-after` and
   `gate-results` blocks.
8. **Phase gate** (section 4.7).

### 4.6 Heavy gates (live behavior proof)

Python tests and artifact checks cannot prove that the apps work. These gates prove behavior.
Each row is one `heavy-run.sh` call. Prefix `H0` rows run on the unchanged tree. Prefix `H1` rows
run after Task 2. All rows write their output to
`measure/tracks/typescript7_native_migration_20260710/evidence/phase2/raw-logs/<id>.log`.
Each command starts with `set -o pipefail;` and records `T0=$(date +%s)` first.

| Id | Command (inside `heavy-run.sh -c`) | Pass condition | Refutation (what must make it fail) |
| --- | --- | --- | --- |
| `H0-test` / `H1-test` | `pnpm --filter marketing exec vitest run --maxWorkers=1` | Exit 0 for H1. For H0, record the numbers only. `Test Files` and `Tests` lines parse as labeled integers. H1 counts meet the rule in `test_counts_match_logs`. | A run that collects fewer files than H0 fails the file-count rule (A4). |
| `H0-build-marketing` / `H1-build-marketing` | `rm -rf apps/marketing/dist && MARKETING_RUNTIME_SMOKE_PORT=<free port> pnpm --filter marketing build` | Exit 0. The build script runs `vinext build` and then `verify-vinext-runtime.mjs`. That script boots the compiled server. It needs HTTP 200 on `/` and HTTP 401 on `/api/campaigns`. After the run, `find apps/marketing/dist -type f -newermt "@$T0"` lists at least 1 file. | The `rm -rf` removes the stale 0.2.0 output (both `dist` folders are git-ignored). A build that leaves no new file fails (A5). The port must have no listener first (`ss -ltn "sport = :<port>"`). |
| `H0-build-fixture` / `H1-build-fixture` | `rm -rf apps/activity-vinext-fixture/dist && pnpm --filter activity-vinext-fixture build` | Exit 0. At least 1 file is newer than `T0`. If `packages/activity-react/dist` or `packages/activity-runtime/dist` is missing, build those two packages first and record it. | Same as above. |
| `H0-probe-fixture` / `H1-probe-fixture` | Start `node node_modules/vinext/dist/cli.js start` in the fixture folder with `PORT=<free port> HOSTNAME=127.0.0.1`. Poll with `curl -s -o body.txt -w '%{http_code}'`. | HTTP 200 and `body.txt` contains the marker `Verify the shared package renders under Vinext.` Stop the server by the PID that `ss -ltnp` shows for the port (never by process name). | Run the same grep on a body without the marker: it must exit 1. Mid Red confirms at `H0` that the marker is present on 0.2.0. If it is absent, Mid Red picks another marker that is present and records it. |
| `H0-types-marketing` / `H1-types-marketing` | `pnpm --filter marketing run check-types` | Exit 0 and 0 diagnostics. These equal the Phase 1 baseline entry for `apps/marketing`. | A new diagnostic fails. It would be a vinext 1.x type change that the Phase 3 trial must not blame on TypeScript 7. |
| `H0-types-fixture` / `H1-types-fixture` | `pnpm --filter activity-vinext-fixture run check-types` | Same rule against the Phase 1 entry for the fixture. | Same. |
| `H1-install` | `pnpm install --frozen-lockfile` | Exit 0 after Task 2. This is the same command that `apps/marketing/cloudbuild.yaml` runs, so a lockfile mismatch would break the next deploy build. | Edit one specifier in a scratch copy of the manifest: the command must fail. |

Order: `H0-types-*`, `H0-build-*`, `H0-probe-fixture`, `H0-test`; then Task 2 (install); then
`H1-install`, `H1-types-*`, `H1-build-*`, `H1-probe-fixture`, `H1-test`. Heavy steps run one at a
time. The orchestrator may merge `H0` rows into fewer calls only if each row keeps its own log
and exit code.

The Phase 1 baseline for both workspaces is exit 0 and 0 diagnostics
(`phase1-workspace-baseline.json`). Those values are old (2026-07-14). The `H0-types-*` rows
refresh them on the current tree. If `H0` fails, record the result as the new baseline and use
that value as the comparison for `H1`.

### 4.7 Green gate, phase gate, and closeout

- **Green gate (Task 2 and Task 3):**
  `PYTHONDONTWRITEBYTECODE=1 P2_GREEN_COMMITS="<sha> <sha>" python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase2`
  exits 0, and all `H1-*` rows exit 0. **Amended 2026-11-06 (4.12.2 and 4.12.4):** the orchestrator
  passes every Green commit in `P2_GREEN_COMMITS` and records the list. The `HR-*` rows run after
  the remediation.
- **Phase gate (build and tests of the two apps):** the `H1-*` sequence above, each row through
  `heavy-run.sh`. The orchestrator also runs these light checks:
  - `git show --name-only --format= <green sha>` for each Green commit. Every path is in the
    allowed list of `test_green_commits_in_scope`.
  - `rg -n "git push|vinext deploy|gcloud|wrangler" <gate logs>` finds 0 lines (`rg` exit 1 and
    no output). Exit 2 is a failed detector (A14). No deploy ran.
  - `git diff --stat -- pnpm-workspace.yaml` is empty for the Green commits.
- **Closeout (Phase 2):** `plan.md` marks Tasks 1 to 3 as `[x]` with the commit SHA. The
  `plan.md` and `tracks.md` text says "upgraded" only if the phase gate exited 0 (A6). The manual
  verification task stays `[b]` with `deferred:product-owner`. The `H1` rows are the Phase 3
  starting point for the two workspaces.

### 4.8 Fixtures, mocks, and live behavior

- Mocks: none new. The marketing suite mocks the database layer and uses `pglite` for the live
  tests. The suite is not edited in this phase.
- Fixtures: none new. The fixture app is the existing `apps/activity-vinext-fixture`.
- Live behavior proof: `H1-build-marketing` (compiled server answers 200 and 401),
  `H1-probe-fixture` (server-rendered page contains the marker), and `H1-test` (the whole
  marketing suite).
- Artifact and documentation tests: all `P2T1*`, `P2T3*`, and the lockfile tests. They prove
  that the notes and manifests are true. They do not prove that the apps work. Only the `H1`
  rows prove that.

### 4.9 Architecture guardrails and changed-contract risks

| Risk | Defense |
| --- | --- |
| The hard-coded `vinext/dist/...` paths move. The vitest aliases, the `Dockerfile` start command, and the runtime check use them. | `test_hardcoded_vinext_paths_exist`. Strategy-time check: the paths exist in 1.2.0 and 1.4.3. |
| The peer rule is bypassed with a warning only (pnpm prints a peer warning and continues). | `test_installed_peers_satisfied`. |
| Hoisting changes the resolved version of a shared package for other apps. | `test_lock_diff_in_scope`: no other importer block changes. |
| New transitive packages bring install scripts. | Review B step (section 4.10). |
| Stale `dist` output gives a false pass. | `rm -rf` before each build and the `-newermt` check. |
| The runtime check uses a fixed default port. A squatter on that port can answer. | Choose a free port. The adversarial role tests the squatter case (section 4.10). |
| `pnpm-workspace.yaml` keeps stale text: `minimumReleaseAgeExclude: vinext@0.2.0` and a comment about the 0.2.0 `image-size` pin. | Do not edit it in this phase (outside the allowed paths). Record it in the note as a follow-up. |
| The Cloud Build install breaks. | `H1-install` uses the same frozen-lockfile command. |

### 4.10 Review roles for Phase 2

| Role | Applies? | Scope and reason |
| --- | --- | --- |
| Review A (correctness) | **Yes** | Check the note against the registry output. Check the scope rule and the lockfile diff. Check that no test passes with nothing done. |
| Review B (security) | **Yes** | Reason: a new framework major with an auth boundary, and new transitive packages. Check: (1) the list of new lockfile package keys is justified by the vinext dependency list; (2) `git diff -U0 pnpm-lock.yaml \| rg -c '^\+.*requiresBuild: true'` shows no new build-script package, or each one is in `allowBuilds` (exit 1 with no output means 0); (3) the 401 probe and the marketing auth tests still pass (`marketing-proxy`, `phase-w3-*-auth`, `runtime-headers`); (4) the `next/headers` and `next/server` shims that the tests alias still resolve. |
| Review C (UX/API) | **Conditional** | Run Review C only if a Green commit touches a file under `apps/*/app`, `proxy.ts`, `vite.config.ts`, or `tsconfig*.json`. The plan allows such a change only if the build fails. Skip reason when no such file changed: the Green diff holds only `package.json` and the lockfile, so a UX/API review has no code to read and would pass with nothing done (A4). The runtime probe and the route-handler inventory test already cover the HTTP contract. The orchestrator records the skip and its reason. |
| Adversarial testing | **Yes**, narrow | Attacks: (1) set a note verdict to "met" for a "not met" range and confirm `test_verdicts_recomputed` fails; (2) leave a stale `dist` and confirm the `-newermt` check fails; (3) change one lockfile specifier and confirm `pnpm install --frozen-lockfile` fails; (4) request `/api/campaigns` with no cookie, a malformed cookie, and a forged header, and confirm 401 each time; (5) start a squatter on the chosen port that answers 200 on `/` and 401 on `/api/campaigns`, then run `verify-vinext-runtime.mjs`. The script may pass falsely (it checks the child exit only per poll). If so, report a finding for tech debt. Do not fix it in this phase. `PROJECT_TESTS` for the role gate is the `H1-test` command. |
| UX browser review | **Yes**, narrow | Reason: jsdom tests and server-side fetches do not run the client bundle of vinext 1.x. A hydration or client-runtime break is invisible to them. Open the production build (`vinext start`) of the marketing app (`/`) and of the fixture (`/`). Check: no console error, no hydration warning, and the fixture check control gives a visible result. The role gate flags a browser review only when UX files change. This diff has none, so the orchestrator starts the role explicitly and sets `PROJECT_DEV_URL`. Daniel called the app non-critical, so two pages are enough. |
| Phase acceptance | **Yes** | Standard. It counts only non-deferred tasks. |

### 4.11 Anti-pattern coverage for Phase 2

| Anti-pattern | Defense in this phase |
| --- | --- |
| A3 | The lock importer count is exactly 2. Vitest counts come from `Test Files` and `Tests` labeled lines. The path count is at least 7. Warning counts are compared with log lines. |
| A4 | Empty `rows` fails. `P2_GREEN_COMMITS` unset fails. A vitest run with fewer files than baseline fails. A build with no new file fails. |
| A5 | The checker recomputes every verdict. Every repo value has a `path:line` citation that the test reads. The note counts equal the raw logs. |
| A6 | `plan.md` and `tracks.md` do not say "upgraded" until the phase gate exits 0. A "not met" peer is never written as "met". |
| A7 | Failures compare by file and name. The warning count uses every log line. No filter drops lines with bare English words. |
| A8 | The orchestrator converts the `[ ]` markers of Phase 2 to `[~]` before Mid Red. |
| A9 | The test file uses `track_dir_resolve`. |
| A14 | Detectors use `rg -n`. Exit 2 fails the gate. |
| A16 | No worktree in this phase. |

### 4.12 Amendment of 2026-11-06 (after the Phase 2 reviews)

Decision owner: the Measure Strategy role (this file). Role base: `6716a15462ec8e380d3f2bd893dc7fa6ecd0c00b`.
`phase_base_sha` does not change: it stays the commit of section 2. Evidence: the three Review
results `review-a-0e5a85543.json`, `review-b-0e5a85543.json`, and `review-c-0e5a85543.json` in
`measure/runs/typescript7_native_migration_20260710/` (all `pass`), and the Green log
`green-p2-t2-acf282174.log` in the same folder. This amendment does not widen the product scope.
The product scope stays the two apps, their `package.json` files, and the lockfile entries.

Trimmed 2026-11-06 (orchestrator request, same day as the amendment). Reason: AGENTS.md has the
Ponytail rules (the minimum that works) and the hashing and provenance policy (do not improve
auditability or provenance unless asked). Removed: the test `test_green_commit_list_is_complete`
and the justification `kind` rule with its tests. The review findings do not ask for them.
A1 came from a short list that the orchestrator passed. The orchestrator now passes the full list.
C2 asked only to archive the failing build log.

#### 4.12.1 Decisions

| Finding | Decision | Reason |
| --- | --- | --- |
| A1 [Major] scope test rejects two bookkeeping paths | **Allow two bookkeeping paths, with narrow rules** (see 4.12.2). The orchestrator passes the full Green commit list in the gate command. | The tech-debt row is a required workflow step (`workflow.md` step 8). The role log is an orchestration artifact. Both belong to this track. The short list, and not the scope rule alone, left two Green commits unchecked. |
| A4 [Nit] `vite.config.ts` outside the fixture type check | **Tech debt, no `tsconfig` change.** | The plan allows an app file only when the build fails. A wider `include` is not a build failure. The build runs the file (esbuild), and it holds three lines. A `tsconfig` change also moves the Phase 3 baseline of this workspace. Severity: low. |
| A2 [Major] `next-env.d.ts` rewritten by the build | **Evidence rule** (see 4.12.4, step 2). | The H1 type checks ran before the rewrite, so no gate covers the new content. |
| A3 and C1 probe logs hold no HTTP status | **New probe logs with labeled lines.** Do not edit the old logs. | A log must show the status it claims (A5). The `H0` run cannot repeat, because vinext 0.2.0 is gone. The note must say that the `H0` status was not archived and that the body file holds the marker. |
| C2 failing fixture build not archived | **Reproduce and archive it** (row `HR-build-fixture-no-vite-config`). | A justification must point to the failure it cites. |
| B1 dead pins in `pnpm-workspace.yaml` | **Tech debt, low.** | The file is outside the allowed paths (section 4.9). |
| B2 acorn repoint (four snapshots, no new key) | **Record only**, in the evidence note. | Both acorn versions were already in the tree. The lock scope test accepts the change. |
| B3 no runtime probe of the `proxy.ts` redirect | **Run the probe now** (row `HR-probe-marketing-redirect`). No repo file changes. | Reviews B and C both name the gap. The cost is one request on a server that the gate starts anyway. |
| B4 `vinext start` binds `0.0.0.0` | **Tech debt, low.** | Not a regression: the 0.2.0 log shows the same bind. |

#### 4.12.2 Scope rule after the amendment

This rule replaces the allowed-path list in the `test_green_commits_in_scope` row of 4.3 and the
list in 4.7. A Green commit may touch only:

- the two app `package.json` files, `pnpm-lock.yaml`, `plan.md` of this track, and the evidence
  folder of this track (as before);
- an app file other than `package.json`, only with an `app_changes_justified` entry in the note.
  The existing check stays as it is: the entry has `path` and `build_log`, and the log exists
  and is not empty. For `vite.config.ts` the log is the failing build log (step 6 of 4.12.4).
  For a `next-env.d.ts` file the log is the clean-state type check of the generated text;
- `measure/tech-debt.md`, only if the commit diff has **no removed line**, and every added line
  starts with `| 2026-` and holds the text `typescript7_native_migration_20260710`;
- one file `measure/runs/typescript7_native_migration_20260710/green-p2-*.log` (a flat file, not
  a sub-folder). Review files (`review-*`) and probe scripts are not allowed in a Green commit.

The orchestrator passes **every** Green commit of the phase in `P2_GREEN_COMMITS` and records the
list in its run log. The list includes the plan and evidence commits. For the audited HEAD
`0e5a85543` it holds 7 commits: `3abb7dcc1`, `6b67d4920`, `c0e2cfbb1`, `71ae73509`, `b4c127a86`,
`627a784cd`, and `0e5a85543`. The accepted list held 2. The new Green commits of the remediation
join the list. The Red, strategy, and review commits are not Green commits, and the Green rules do
not apply to them. No test checks the list. The orchestrator owns it.

#### 4.12.3 Work for Red (test file only)

Red edits `measure/tests/test_typescript7_native_migration_phase2.py`. Red adds no product file.

1. Extend `P2T2ScopeTests.test_green_commits_in_scope` with the bookkeeping rules of 4.12.2. Use a
   pure helper, as `_lock_change_is_in_scope` does, so that synthetic tests can call it.
2. Add synthetic falsification tests for that helper. Each case must fail on a broken input:
   a tech-debt diff with one added row and the track id (accepted); the same diff with one removed
   line (rejected); an added row with another track id (rejected); an added line that does not
   start with `| 2026-` (rejected); `green-p2-t2-x.log` in the track run folder (accepted);
   a log in another run folder (rejected); `review-a-x.json` in the track run folder (rejected);
   a `.py` file in the track run folder (rejected).
3. Add the gate ids of 4.12.5 to the `gate-results` completeness test. Add
   `test_probe_logs_hold_status`: the log of `HR-probe-fixture` has the line `HTTP_STATUS=200`;
   the log of `HR-probe-marketing-redirect` has `HTTP_STATUS=307` and a line `LOCATION=` whose
   path starts with `/login?returnTo=`. Parse the labeled lines at the line start (A3). A log
   with only the server banner fails (the two H1 probe logs are such logs).

Red adds no other test. Expected Red result: the gate-id and status tests fail at the current
HEAD, because the `HR-*` logs do not exist. The helper tests pass when Red supplies the full
Green list. The Red run must show an error count of 0 (section 4.4).

#### 4.12.4 Work for Green (in this order; all heavy steps through `heavy-run.sh`)

1. **Start state.** `git status --porcelain --untracked-files=no -- apps/marketing apps/activity-vinext-fixture`
   shows exactly the two `next-env.d.ts` files. Record the output in the Green log.
2. **A2 control matrix.** Both regenerated files hold the same text, and `.next/` is git-ignored.
   For each app and each content `blank` (empty file), `generated` (the current rewritten text),
   and `committed` (the text at HEAD, from `git show HEAD:<path>`): write the content, run
   `rm -rf apps/<app>/.next` (and `apps/marketing/tsconfig.tsbuildinfo` for marketing, because
   `incremental` is on), then run `pnpm --filter <app> run check-types` into the log
   `HR-types-<app>-<content>.log`. Append the lines `EXIT=<n>` and `DIAGNOSTICS=<n>`. Compute
   `n` with `rg -c 'error TS[0-9]+' <log>`: exit 1 with no output means 0, and exit 2 stops the
   gate (A14). That gives 6 runs.
3. **Choose the content.**
   - If `generated` gives `EXIT=0` and `DIAGNOSTICS=0` for both apps, commit the generated text
     for both files, with an `app_changes_justified` entry for each that cites its
   `HR-types-<app>-generated` log. Reason: the build then rewrites the same
     text, and the tree stays clean after each build.
   - If `blank` also gives 0 for an app, write in the note: "`next-env.d.ts` has no effect on
     this type check". The choice stays the same. A 0 result from `blank` shows that the check
     cannot judge the content (A4). It does not change the idempotency reason.
   - If `generated` fails for any app, restore the committed text, stop with `status: blocked`,
     and ask the PM. Do not hide the churn with a `.gitignore` change.
4. **Idempotency.** Run the `H1` build rows again as `HR-build-marketing` and `HR-build-fixture`
   (same commands as section 4.6, same free-port rule). Afterwards
   `git status --porcelain --untracked-files=no -- apps/marketing apps/activity-vinext-fixture`
   must print nothing. The current tree (two modified files) is the refutation.
5. **Probes.** `HR-probe-fixture`: the `H1` fixture probe with
   `curl -s -o body.txt -w 'HTTP_STATUS=%{http_code}\n'` appended to the log; the marker must be
   in the body. `HR-probe-marketing-redirect`: start `node node_modules/vinext/dist/cli.js start`
   in `apps/marketing` with `NODE_ENV=production`, `PORT=<free port>`, and the dummy
   `DATABASE_URL` that `verify-vinext-runtime.mjs` uses. Run
   `curl -s -o /dev/null --max-redirs 0 -w 'HTTP_STATUS=%{http_code}\nLOCATION=%{redirect_url}\n' http://127.0.0.1:<port>/campaigns`
   and the same for `/` as a control. Expected: 307 with a `LOCATION=` path that starts with
   `/login?returnTo=` for `/campaigns`, and 200 for `/`. If both answer the same, the probe
   cannot tell cases apart and does not count. Stop each server by the PID that `ss -ltnp` shows
   for its port. If `/campaigns` does not give 307, that is a finding: stop with `status: blocked`.
6. **C2 reproduction.** `HR-build-fixture-no-vite-config`: move
   `apps/activity-vinext-fixture/vite.config.ts` to a folder outside the repository, run the
   fixture build, append `EXIT=<n>`, and move the file back, also when the build fails (use a
   `trap`). The log must hold `EXIT=` with `n` of 1 or more and the text
   `No Vite config was found for this project`. Then `git status` must show no change for that
   file. Point the `vite.config.ts` justification (`build_log`) at this log.
7. **Note.** Update `evidence/phase2-vinext-peer-check.md`: point each justification entry at its
   `HR-*` log; add the `HR-*` entries to `gate-results`; state that the `H0` probe status
   was not archived and that the `H0` body file holds the marker; correct the "HTTP 200" claim to
   cite `HR-probe-fixture`; add the B2 record (four snapshots moved from acorn 8.17.0 to 8.19.0,
   no new package key). Do not edit an old log.
8. **Tech debt.** One append-only commit to `measure/tech-debt.md` with three rows, each holding
   the track id: A4 (fixture `vite.config.ts` is outside the type check); B1 (dead
   `image-size` override and `minimumReleaseAgeExclude` entry, and the stale comment, in
   `pnpm-workspace.yaml`); B4 (`vinext start` binds `0.0.0.0` and ignores `HOSTNAME`). The file
   already has more than 50 lines. Default: append anyway, as the earlier Green commit did. The
   orchestrator may ask the PM to prune the file.
9. **Commits and gate.** Every commit names its paths and carries the track id. Write a Green log
   `green-p2-amend-<sha>.log` with all new commits. The orchestrator then runs the full module
   command with `P2_GREEN_COMMITS` set to the 7 earlier commits plus the new ones. The result
   must be exit 0.

Not repeated, with the reason: `H1-install`, `H1-build-*` in their old form, and `H1-test`. The
inputs (`package.json` files, lockfile, `vite.config.ts`, and sources) do not change. Review A
re-ran both builds on the audited HEAD with exit 0.

#### 4.12.5 New gate rows

| Id | Pass condition (labeled lines) | Refutation |
| --- | --- | --- |
| `HR-types-marketing-{blank,generated,committed}`, `HR-types-fixture-{blank,generated,committed}` | `EXIT=` and `DIAGNOSTICS=` lines; the chosen content gives 0 and 0 | A `.next` folder left in place, or a stale `tsbuildinfo`, makes the run invalid (the log must show `rm -rf` ran first). |
| `HR-build-marketing`, `HR-build-fixture` | Exit 0, and tracked files unchanged afterwards | The current tree fails the clean check. |
| `HR-probe-fixture` | `HTTP_STATUS=200` and the marker in the body | A banner-only log fails `test_probe_logs_hold_status`. |
| `HR-probe-marketing-redirect` | `/campaigns` gives `HTTP_STATUS=307` and `LOCATION=/login?returnTo=...`; `/` gives 200 | If `/` also redirects, the probe is void. |
| `HR-build-fixture-no-vite-config` | `EXIT=` of 1 or more and the vinext error text; the file restored | A run with the file in place gives `EXIT=0` and does not count. |

#### 4.12.6 Review roles after the remediation

| Role | Decision | Reason |
| --- | --- | --- |
| Review A | **Rerun** on the new HEAD | The scope test and the note change. |
| Review B | **Carry forward**; rerun only if the Green diff touches a `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `proxy.ts`, or `apps/marketing/scripts/` | The remediation holds type declarations, evidence, and tech-debt rows. No dependency, auth, or runtime file changes. The B3 probe result is evidence for the file list, not a new security surface. |
| Review C | **Carry forward**; rerun only if a Green commit touches `apps/*/app`, `proxy.ts`, `vite.config.ts`, or `tsconfig*.json` | `next-env.d.ts` is not in the trigger list, and the A4 decision keeps `tsconfig.json` unchanged. |
| Adversarial and UX browser review | As in 4.10 | Add one attack to the adversarial list: add a removed line to a tech-debt diff and confirm that the scope test fails. |

The carry-forward check is `git diff --name-only 0e5a85543..<new head> -- apps pnpm-lock.yaml pnpm-workspace.yaml`.
The orchestrator records its output with the decision.

#### 4.12.7 Anti-pattern coverage for the amendment

| Anti-pattern | Defense |
| --- | --- |
| A3 | `HTTP_STATUS=` and `LOCATION=` are labeled lines that the status test parses at the line start. `EXIT=` and `DIAGNOSTICS=` are labeled lines for the reader of the Green log. |
| A4 | The scope test still fails when `P2_GREEN_COMMITS` is unset. A `blank` control run shows if the type check can judge the content. The redirect probe has a `/` control. |
| A5 | The note cites `HR-*` logs for every status it claims. The `H0` gap is stated and not hidden. Old logs are never edited. |
| A6 | `plan.md` and `tracks.md` say "reviews pass" only with the three result files. They say nothing on a rerun that has not happened. |
| A7 | The tech-debt rule rejects any removed line and requires the full track id text, not a bare word. |
| A14 | Every `rg` detector in a gate treats exit 2 as a failure. |

## 5. Phase 3 outline: TypeScript 7 trial

The full section comes before Phase 3 starts. These points are fixed now.

**First Phase 3 task (PM 2026-11-21): the vinext bump.** Section 5a holds the full strategy. The
report target moved to 2026-12-02 (orchestrator default, 2026-11-28).

**Outline of the later Phase 3 tasks.** Each task gets its own strategy round before its Red role
starts. The risk values below are planning values. The round may change them.

| Task (plan order) | Risk | Security | UX/API | Adversarial | Browser | Main concern |
| --- | --- | --- | --- | --- | --- | --- |
| Create the trial worktree (7.0.x) | low | skip | skip | skip | skip | The worktree branches from the commit that holds the vinext bump. The check is the lockfile snapshot rule below. |
| Type checks, memory and time | medium | skip | skip | yes | skip | A fast run with missing diagnostics is a failed measurement (A4, A5). The 5.9.3 control run comes first. |
| Tests on the trial install | medium | skip | skip | yes | skip | Compare failures by file and name against the control (A7). |
| List the regressions | low | skip | skip | yes | skip | The classifier. No entry stays unclassified (A4). |
| Fix the regressions | **high** | yes | conditional | yes | conditional | The task changes product files. It needs a full strategy that names each file after the list exists. |
| Run the 7.1 beta | low | skip | skip | skip | skip | A test removes the beta rows and recomputes the verdict. |
| One-compiler plan and report | low | skip | skip | skip | skip | A wrong claim, not a code defect (A5, A6). |
| Remove the trial worktree | low | skip | skip | skip | skip | The task deletes paths. Look at each target first. The proof is `git worktree list` and `git branch -a`. |
| Manual verification task | low | skip | skip | skip | skip | PM 2026-11-21: closed on automated evidence. |

The trial worktree must start from a commit that holds the vinext bump of section 5a. Then the
5.9.3 control and the 7.0.x runs use the same vinext version.

**Baseline facts that shape the method.**

- `compiler-baseline.json` and `phase1-workspace-baseline.json` give wall time per workspace but
  peak RSS only for `packages/types` (397,052 KiB). They cannot support a memory table for 31
  workspaces. Therefore Phase 3 must add a **paired control**: run TypeScript 5.9.3 in the trial
  worktree, on the same clean tree, with `/usr/bin/time -v`, before the compiler swap.
- The baseline ran on a dirty main tree with swap at 71 percent. 15 of 31 workspaces are marked
  contaminated. The trial worktree comes from committed master and is clean. So the control also
  separates "dirty tree" effects from "compiler" effects.
- Phase 1 has no test baseline. Therefore the control also runs the tests (vitest with
  `--maxWorkers=1`, one workspace at a time) before the swap. Without the control, a failing test
  cannot be classified.
- The table has these columns: `baseline-5.9.3` (from the JSON, wall time only), `control-5.9.3`
  (worktree, RSS and time), `stable-7.0.x`, and `beta-7.1-extra`. The plan asks for a 5.9.3 and a
  7.0.x column; the extra columns do not conflict with it.

**What counts as a regression.** Each of the 31 workspaces gets exactly one class:

| Class | Definition |
| --- | --- |
| `regression` | The control passes (exit 0, 0 diagnostics) and 7.0.x exits non-zero or reports a diagnostic. Or a diagnostic exists in 7.0.x and not in the control for the same file and code. Or a test passes in the control and fails on 7.0.x. Each entry has a cause class (`types` default, removed option, diagnostic change, emit change, other). |
| `pre-existing` | The failure is in the control too, with the same file, code, and test name. It cites its `phase1-pre-existing-failures.json` or baseline entry. |
| `improved` | The control fails and 7.0.x passes. Record it. It is not a defect. |
| `invalid-measurement` | The run ended with exit 134 or 137, a swap delta above the ceiling, or a diagnostic set smaller than the control without an explanation. A faster run with missing diagnostics is this class (spec FR-3). `apps/reading-advantage` has no valid 5.9.3 baseline; its class is `invalid-measurement` unless the control completes. |

Compare diagnostics by file, line, and code. Do not compare message text. Do not use a bare
count (A3). The report adds a separate "performance finding" list. A slower or larger 7.0.x run is
a finding, not a correctness regression.

**Measurement.**

- Peak memory: `Maximum resident set size` from `/usr/bin/time -v`, in KiB, parsed by label.
  Also record `SwapFree` before and after, and the exit code. Exit 134 or 137 means out of memory.
- Wall time: `Elapsed (wall clock) time` from the same output. Run each workspace once. Run
  `packages/types`, `packages/domain`, and `apps/primary-advantage` three times each and report
  the median and the range. Record `loadavg` before each run. Discard and repeat a run that
  starts while another heavy job runs.
- Each workspace runs alone, under `heavy-run.sh`, with `TURBO_CONCURRENCY=1`.
- Record the checker setting that 7.0.x uses by default. For the three heaviest workspaces add
  one run with a lower checker count, labeled as such. Do not set a Phase 5 value from it.

**Gate version.** The gate is the latest stable 7.0.x on the day of the trial. The exact number is
written in the report. The 7.1 beta runs only on `packages/types`, `packages/domain`, and
`apps/primary-advantage`, in the `beta-7.1-extra` column. A test recomputes the verdict from the
stable rows alone. If the verdict changes when beta rows are removed, the report is invalid.

**Isolation.** The main lockfile must not change. The main tree is dirty and other sessions may
edit the lockfile. So the check compares a snapshot of
`git diff -- pnpm-lock.yaml package.json pnpm-workspace.yaml` taken before the trial with a
snapshot taken after. Equal snapshots pass. The plan text says `git diff --quiet` exits 0. That
holds only if no other session edits those files. The snapshot rule is the safe form.

**Worktree.** The trial needs `git worktree add`. A16 forbids it. Section 8 (question 2) asks the
PM for a recorded exception. The cleanup task must end with `git worktree list` and
`git branch -a` showing no trial item. Check free disk before the install (`df`).

**Roles (planned).** Review A: yes. Review B: skip (no code or dependency change in the main
tree). Review C: skip (no UI or API). Adversarial: yes, against the classifier (a swapped
diagnostic, a missing diagnostic, a beta row that changes the verdict). UX browser: skip.

## 5a. Phase 3 Task 1: bump vinext to 1.4.6

Scope: `apps/marketing` and `apps/activity-vinext-fixture` move from vinext 1.2.0 to vinext 1.4.6.
The change touches two `package.json` files and the lockfile entries that follow. The task also
records one check or one defer decision for each Oxc lesson, and the build time before and after.
Evidence class: automated. Risk: **medium** (5a.2). The target version is the constant `TARGET`
in the Red test file. Its value is `1.4.6` (PM, 2026-11-21).

### 5a.1 Facts observed at strategy time (2026-11-28, read-only)

These facts are inputs. Green must re-verify each one and record the result.

| Fact | Value | Source |
| --- | --- | --- |
| Declared version | `vinext` `1.2.0`, exact, in both apps | `apps/marketing/package.json:24`, `apps/activity-vinext-fixture/package.json:12` |
| Lockfile entries | two importer `vinext:` blocks, the package key `vinext@1.2.0:`, and one snapshot key | `rg -n 'vinext' pnpm-lock.yaml` (lines 525, 915, 14130, 26439) |
| Other pins | None. Only the two manifests declare `vinext`. `pnpm-workspace.yaml:145` holds the stale entry `vinext@0.2.0` in `minimumReleaseAgeExclude`. It does not pin 1.2.0. | `rg -n 'vinext' pnpm-workspace.yaml` |
| Registry | 1.4.6 was published 2026-11-16. 1.4.7 was published 2026-11-26 and is now the `latest` tag. Both have the same peers. | `npm view vinext time --json`, `npm view vinext dist-tags --json` |
| 1.4.6 peers | `vite ^8.0.0`, `react ^19.3.1`, `react-dom ^19.3.1`, `@vitejs/plugin-react ^5.1.4 \|\| ^6.0.0`, `@vitejs/plugin-rsc ^0.5.37` (optional), node `>=22` | `npm view vinext@1.4.6 peerDependencies engines --json` |
| 1.4.6 dependencies | The same six packages as 1.2.0. Only `@vinext/types` moves from `^1.0.1` to `^1.0.2`. The lockfile already resolves 1.0.2. | `npm view vinext@1.4.6 dependencies --json` |
| Repo values | React and React DOM `19.2.9`, exact, in both manifests and in `overrides`. Vite override `8.1.6`. plugin-react `6.0.3`. Node `24.19.0`. | manifests, `pnpm-workspace.yaml` |
| React pin guard | `tests/security-upgrade-adversarial.test.ts` holds `react: "19.2.9"` in `STRATEGY_REQUIRED_PINS`. `measure/tech-debt.md:25` says a React upgrade needs its own track. | those two files |

**Expected result: the React peer is "not met" for 1.4.6.** React 19.2.9 does not satisfy
`^19.3.1`. Each other peer is met. Phase 2 met the same case for 1.4.3, and the PM chose 1.2.0 to
avoid it. The PM decision of 2026-11-21 asks for 1.4.x and does not name React. Section 5a.3 holds
the decision gate.

Facts that shape the method:

- No tracked manifest declares `oxlint`, `oxfmt`, or `tsrs`. No `.oxlintrc.json`, `.oxfmtrc.json`,
  or `.git-blame-ignore-revs` exists. Lint is ESLint (`eslint .` in marketing, shared base config).
  The fixture has no lint script.
- The fixture has no `test` script and no vitest. Its live proof is the build and the probe.
- The workspace packages that the apps import export from `dist/`. That folder is git-ignored. A
  fresh worktree has none. Green builds the packages first (gate `P-prereq-build`).
- Both `next-env.d.ts` files are tracked. `vinext build` rewrites them. The main checkout holds
  uncommitted owner edits of both files.
- `.gitignore` lists `.next/` and `dist/`. It does not list `.vinext/`.
- `next` stays installed (override `next: 16.4.1`). Marketing imports `@reading-advantage/api`, which
  lists `next` as a required peer (`packages/api/package.json:73`). Many other apps declare `next`
  (`rg -l '^\s+"next":' apps/*/package.json` lists them). Some declare `eslint-config-next`.
  Marketing and the fixture declare neither.
- Math compared vinext 0.0.55 with 1.4.6 and got ratios of 0.34 to 0.59. This task compares 1.2.0
  with 1.4.6. The Math ratio is not the expected ratio here. No ratio threshold applies.

### 5a.2 Risk classification and review applicability

| Item | Risk | Reason |
| --- | --- | --- |
| Task 1 | **medium** | A server framework moves three minor versions on an app with an auth boundary. The React peer is not met. The lockfile changes under the `hoisted` linker. The app is non-critical (Daniel, 2026-11-05) and no deploy runs. |
| Task 1 under option B (5a.3) | **high** | A repo-wide React change touches `pnpm-workspace.yaml`, the manifests of many apps, and a guard test. It needs a new strategy before Red. |

| Role | Applies? | Scope and reason |
| --- | --- | --- |
| Review A (correctness) | **Yes** | Check each note block against its raw log and the registry output. Check the scope rule and the lockfile diff. Check that no test passes with nothing done. |
| Security review (Review B) | **Yes** | Reason: new framework minors, new lockfile keys, and an unmet peer. Check (1) each added lockfile package key is vinext, a vinext dependency, or an `explained_drift` entry. (2) `git diff -U0 pnpm-lock.yaml \| rg -c '^\+.*requiresBuild: true'` shows no new build-script package. Each one that appears must be in `allowBuilds`. Exit 1 with no output means 0. Exit 2 fails the detector (A14). (3) The 401 on `/api/campaigns` holds. The `marketing-proxy`, `phase-w3-*-auth`, and `runtime-headers` tests pass. (4) `verify-vinext-runtime.mjs` is byte-equal to the base. |
| UX/API review (Review C) | **Conditional** | Run only if a Green commit touches `apps/*/app`, `proxy.ts`, `vite.config.ts`, or `tsconfig*.json`. The expected diff has two manifests and the lockfile, so the role has no code to read. The orchestrator records the skip and the reason (A4). |
| Adversarial testing | **Yes**, narrow | The attacks are in 5a.9. |
| Browser review | **Yes**, narrow | jsdom tests and server-side fetches do not run the client bundle. An unmet React peer makes a hydration break more likely, and these tests cannot see it. The gate rows `H1-browser-*` do the work. If no browser tool exists, the gate ends `blocked`. It does not skip (lesson L9). |
| Phase acceptance | At the end of Phase 3 | Later tasks remain in the phase. The orchestrator may run a task-level Review A after this task. |

### 5a.3 Decision gate G3.0 (before Green edits a manifest)

Green runs G3.0 first. It is a light step.

1. Run `npm view vinext@1.4.6 peerDependencies engines --json` and
   `npm view vinext@1.4.6 dependencies --json`. Save both outputs in the note block `peer-check-p3`.
2. Compare each peer range with its repo value. Cite each repo value as `path:line`. Use
   `cmd:node --version` for Node.
3. If every non-optional row is "met", go to step 4 of the order of work in 5a.9.
4. If a non-optional row is "not met", the default below applies until the orchestrator records a
   PM answer.

| Option | Meaning | Effect |
| --- | --- | --- |
| A | Stay on vinext 1.2.0. | The task becomes a record. No manifest changes. |
| B | Move React and React DOM to 19.3.1 for the whole repository, in its own track. | `pnpm-workspace.yaml`, the manifests of many apps, and a guard test change. Risk becomes high. |
| **C (default)** | Install 1.4.6 under React 19.2.9. Record the unmet peer as a named finding. Live gates decide. | The task stays inside the two apps. The PM can reverse it. |
| D | Use 1.4.7 instead of 1.4.6. | The peers are the same. Change the constant `TARGET`. |

Default C has three conditions:

1. The `peer-check-p3` block holds a `waiver` object with the keys `peer`, `range`, `repo_value`,
   `decision_ref`, and `live_gates`. The value of `decision_ref` is `strategy default C, 2026-11-28`
   or a PM reference. `live_gates` is a list of gate ids.
2. Every gate in `live_gates` has exit 0, and both `H1-browser-*` gates report `CONSOLE_ERRORS=0`.
3. The orchestrator records the waiver in `plan.md` before the Green commit merges to master.

If a condition fails, Green runs the rollback (5a.8) and ends with `status: blocked`. The
orchestrator then asks the PM to choose option B.

### 5a.4 phase_base_sha capture point

The strategy commit is the point where Phase 3 starts. The orchestrator captures the immutable
`phase_base_sha` in this order:

1. The strategy commit exists on the branch that Red starts from.
2. The orchestrator runs
   `git log -1 --format=%H -- measure/tracks/typescript7_native_migration_20260710/test-strategy.md`.
3. The output is the `phase_base_sha`. The orchestrator writes it to its run log and to the prompt
   of Mid Red **before any later edit of this file**.

A later strategy round for another Phase 3 task edits this file and moves the output of step 2.
Therefore the orchestrator never recomputes the value. It reads the value from its run log.

Two checks refute a wrong capture: the value is not equal to `190c38252` (the role base, which
predates the strategy), and `git merge-base --is-ancestor 190c38252 <value>` exits 0. This file
holds no phase SHA, so no edit can invalidate it.

### 5a.5 Test file that Red writes

Red writes one new file: `measure/tests/test_typescript7_native_migration_phase3_vinext.py`. It uses
the Python standard library only. Red does not edit `test_typescript7_native_migration_phase2.py`
(history, section 5a.7 explains the effect). Red may import the Phase 2 helpers `satisfies`,
`resolve_installed`, `_lock_vinext_importer_entries`, `_declared_vinext`, `_lock_sections`,
`_lock_change_is_in_scope`, `_changed_lock_lines`, `_bookkeeping_path_is_allowed`,
`_parse_vitest_counts`, and `_labeled_values`. Red may copy them instead. The file adds no
dependency and no hash. It resolves the track folder with `track_dir_resolve` (A9).

The decisive Red tests read tracked files only. A worktree with no `node_modules` cannot fake
them. Tests that read an installed package fail with a message that names the missing install.

| Class and test | State at base | What it proves | Falsification |
| --- | --- | --- | --- |
| `P3T1TargetTests.test_target_is_stable_1_4_x` | green (guard) | `TARGET` matches `^1\.4\.\d+$`. It has no `^` and no `~`. | Set `TARGET` to `1.5.0` or `^1.4.6`: fail. |
| `...test_both_apps_pin_target` | **red** | Both apps declare `vinext` equal to `TARGET`, exact. | Leave one app at 1.2.0: fail. |
| `...test_exactly_two_manifests_declare_vinext` | green (guard) | A scan of every tracked `package.json` finds exactly 2 declarations of `vinext`. Both are the two apps. The count is a labeled integer (A3, A4). | Add a third manifest that declares vinext: fail. |
| `...test_lock_importers_resolve_target` | **red** | The lockfile has exactly 2 importer entries for `vinext`. Each `specifier` equals `TARGET`. Each `version` starts with `TARGET`. | Edit one specifier: fail. |
| `...test_lock_has_one_vinext_key` | **red** | The `packages:` section has exactly one key `vinext@<version>:`. It is `vinext@TARGET`. The text `vinext@1.2.0` appears 0 times. | Keep the old key beside the new key: fail (A3). |
| `...test_installed_matches_target` | red (no install) | For each app, `resolve_installed(app, "vinext")` has the version `TARGET`. | Skip the install: fail. |
| `P3T1PeerTests.test_note_blocks_parse` | **red** | The note `evidence/phase3-vinext-1-4-6.md` exists. It has the seven fenced JSON blocks of 5a.10. | Delete the note or one block: fail. |
| `...test_peer_rows_recomputed` | **red** | Each row of `peer-check-p3` has a verdict. `satisfies(repo_value, range)` gives the same verdict. Each `repo_source` is `path:line` and that line holds the value. At least 6 rows exist (A4, A5). | Flip one verdict, or cite a wrong line: fail. |
| `...test_unmet_peer_has_waiver_or_fix` | **red** | A non-optional "not met" row needs a `waiver` that meets 5a.3. The object is complete. Every `live_gates` entry has exit 0 in `gate-results-p3`. Both browser gates are present. | Write `met` for a "not met" range, or drop a live gate: fail (A5, A6). |
| `...test_hardcoded_vinext_paths_exist` | red (no install) | Each `vinext/dist/...` path in `apps/marketing/vitest.config.ts`, `apps/marketing/Dockerfile`, and `verify-vinext-runtime.mjs` exists in the installed package. At least 7 distinct paths are found. | Point one alias at a missing shim: fail. |
| `P3T1PinInventoryTests.test_pin_inventory_matches_scan` | **red** | The `pin-inventory` block lists each tracked file that names `vinext` in `package.json`, `pnpm-workspace.yaml`, `.npmrc`, and `.pnpmfile.cjs`. The test rescans and compares. The stale `vinext@0.2.0` entry is a row with `changed: false`. At least 3 rows (A4). | Remove a row, or mark the stale entry as changed: fail. |
| `P3T1ScopeTests.test_green_commits_in_scope` | **red** (env unset) | `P3_GREEN_COMMITS` lists the Green commits. Each commit touches only these paths: the two app `package.json` files, `pnpm-lock.yaml`, the evidence folder of this track, and `plan.md` of this track. It may also touch one flat `measure/runs/<track>/green-p3-*.log`. It may touch `measure/tech-debt.md` under the Phase 2 append rule. The test **fails** when the variable is unset (A4). | Add a stray file to a scratch commit: fail. |
| `...test_denied_paths_untouched` | **red** (env unset) | No Green commit touches `pnpm-workspace.yaml`, `tests/security-upgrade-*.test.ts`, `apps/*/next-env.d.ts`, `.gitignore`, `apps/marketing/scripts/verify-vinext-runtime.mjs`, or `apps/marketing/vitest.config.ts`. | Touch one denied path: fail. |
| `...test_lock_diff_in_scope` | **red** (env unset) | In the Green commits each lockfile change is inside the two app importer blocks or inside `packages:` and `snapshots:`. Another importer block must not change. | Edit another importer: fail. |
| `...test_lock_key_changes_explained` | **red** | The `lock-key-changes` block lists the `packages:` keys added and removed. The test recomputes both sets from the Green diff. Each added key is vinext, a vinext dependency (from the registry output in the note), or an `explained_drift` entry with a reason. | Add an unexplained key: fail (A5). |
| `P3T1GateEvidenceTests.test_gate_results_complete` | **red** | `gate-results-p3` has one entry for each gate id of 5a.6. Each has `command`, `exit`, `log`, `start_epoch`. Each exit follows the pass condition. Each log exists and is not empty. Each heavy command holds `HEAVY_PRIORITY=p2` and `heavy-run.sh`. | Remove an entry, or lower the priority: fail. |
| `...test_log_claims_match_labels` | **red** | For each gate, the labeled lines `GATE=`, `EXIT=`, and `ELAPSED_S=` at the start of a log line equal the note entry. No `ELAPSED_S` is 1800 or more (lesson L7). | Edit the log or the note: fail (A3, A5). |
| `...test_vitest_counts_match_logs` | **red** | The labeled lines `Test Files  N passed (N)` and `Tests  M passed (M)` equal the note counts. `H1` files are not fewer than `H0` files. `H1` passed tests are not fewer than `H0`. A failure after the bump must be in the `H0` failure set, compared by file and name (A3, A7). The command holds `--maxWorkers=1`. | Drop a test file from the run: fail (A4). |
| `...test_warning_counts_match_logs` | **red** | For each build and install log, `warning_line_count` equals the number of lines that match `(?i)warn`, and `peer_line_count` equals the lines that match `(?i)unmet peer`. The test uses the whole log (A7). | Edit the log or a count: fail. |
| `...test_verify_script_is_oracle` | **red** (env unset) | No Green commit changes `verify-vinext-runtime.mjs`. The script text still holds the checks `!== 200` and `!== 401`. The gate log `H1-verify-marketing` holds `PORT_FREE=1` and `EXIT=0`. | Weaken the script: fail. |
| `...test_build_times_recomputed` | **red** | See 5a.7. The test recomputes each median and ratio from the labeled `BUILD_RUN=` lines. | Edit one value in the note: fail. |
| `...test_oxc_lessons_complete` | **red** | See 5a.8. The block has each lesson id once. | Delete a row: fail (A3, A4). |
| `...test_rollback_proven` | **red** | See 5a.8. | Break the command: fail. |
| `...test_no_deploy_or_push_in_logs` | **red** | The gate logs hold 0 lines that match `git push\|vinext deploy\|gcloud\|wrangler`. A read error is a failure (A14). | Add a deploy line to a log: fail. |
| Synthetic tests for the helpers | green (guard) | The scope helpers accept a good input and reject a bad one. The bad inputs are: a lock edit in another importer, `pnpm-workspace.yaml`, `apps/marketing/next-env.d.ts`, and a `.py` file in the run folder. | Break a helper: at least one case fails. |

The Red run shows `FAILED (failures=N)` and no `errors=` part. An error (for example an
`ImportError`) means a broken test, not a valid Red. A missing note must make a test `self.fail(...)`.
It must not raise. Red parses `N` as a labeled integer and lists the green guards by name (A3).
Red does not write counts into `spec.md` or `plan.md`.

### 5a.6 Targeted Red command, Green gate, and heavy gates

**RED_TEST_COMMAND** (light, exits non-zero at base):

```
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \
  measure.tests.test_typescript7_native_migration_phase3_vinext
```

**GREEN_TEST_COMMAND** (run from the repo root of the Green worktree, in this order; stop at the
first non-zero exit; `$WT` is that root; each `PORT` has no listener, checked with
`ss -ltn "sport = :<port>"`):

```
HR() { HEAVY_PRIORITY=p2 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=5400 \
  bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c "$1"; }
cd "$WT" && \
PYTHONDONTWRITEBYTECODE=1 P3_GREEN_COMMITS="<sha> <sha>" \
  python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase3_vinext && \
HR "cd $WT && set -o pipefail; rm -rf apps/activity-vinext-fixture/dist && pnpm --filter activity-vinext-fixture build" && \
HR "cd $WT && set -o pipefail; rm -rf apps/marketing/dist && MARKETING_RUNTIME_SMOKE_PORT=4391 pnpm --filter marketing build" && \
HR "cd $WT && set -o pipefail; pnpm --filter marketing exec vitest run --maxWorkers=1" && \
HR "cd $WT && set -o pipefail; MARKETING_RUNTIME_SMOKE_PORT=4393 node apps/marketing/scripts/verify-vinext-runtime.mjs"
```

The `marketing build` script runs `vinext build` and then the verify script once. The last line runs
the verify script a second time on the finished build, as the plan asks. The fixture has no test
script, so the fixture row is the build and the probe `H1-probe-fixture`. The note records "no test
script" and does not claim a pass (A5).

Each gate below is one `HR` call. Each command starts with `set -o pipefail;`. Each log
starts with the labeled lines `GATE=<id>` and `CMD=<command>`, and ends with `EXIT=<n>` and
`ELAPSED_S=<n>`. Logs go to `evidence/phase3/raw-logs/<id>.log`. Prefix `P` rows prepare the
worktree. Prefix `H0` rows run on the base tree (vinext 1.2.0). Prefix `H1` rows run after the bump.

| Id | Command (inside `HR`) | Pass condition | Refutation |
| --- | --- | --- | --- |
| `P-install-base` | `pnpm install --frozen-lockfile`, then print `VINEXT=` from `node -p "require('vinext/package.json').version"` | Exit 0 and `VINEXT=1.2.0`. The log holds `DISK_FREE_MB=<n>`. | A different version means the base is wrong: stop. |
| `P-prereq-build` | `pnpm --workspace-concurrency=1 --filter 'marketing^...' --filter 'activity-vinext-fixture^...' run build` | Exit 0 and `DIST_MISSING=0` (the count of imported workspace packages with no `dist/`). Not timed. | A package with no `dist/` fails the count. A failure that has no link to vinext ends `blocked`. |
| `H0-types-marketing`, `H0-types-fixture` | `pnpm --filter <app> run check-types` | Record exit and `DIAGNOSTICS=<n>` (`rg -c 'error TS[0-9]+'`; exit 1 means 0; exit 2 stops the gate, A14). This is the base. | A base failure is a pre-existing result. `H1` compares with it. |
| `H0-build-marketing`, `H0-build-fixture` | the build commands of the Green gate, with `T0=$(date +%s)` first | Exit 0. `NEWFILES=<n>` (`find <app>/dist -type f -newermt "@$T0"`) is 1 or more. | Stale `dist/` gives `NEWFILES=0` and fails (A5). |
| `H0-probe-fixture` | Start `node node_modules/vinext/dist/cli.js start` in the fixture folder with `PORT`, `HOSTNAME=127.0.0.1`. Run `curl -s -o body.txt -w 'HTTP_STATUS=%{http_code}\n'`. Stop by the PID of `ss -ltnp` for the port. | `HTTP_STATUS=200` and `body.txt` holds `Verify the shared package renders under Vinext.` | A body with no marker: `rg` exits 1 and the gate fails. |
| `H0-time-marketing`, `H0-time-fixture` | The timed loop of 5a.7 | Three lines `BUILD_RUN=` with `EXIT=0`. | See 5a.7. |
| `H0-test` | `pnpm --filter marketing exec vitest run --maxWorkers=1` | Record exit, counts, and failures. This is the base. | A base failure is pre-existing. |
| `H0-guard`, `H1-guard` | `pnpm exec vitest run --maxWorkers=1 tests/security-upgrade-version-guard.test.ts tests/security-upgrade-adversarial.test.ts` (root) | Exit 0 at both points. The lockfile floors and the React pin still hold. | A changed override or floor fails the guard. |
| `H0-lint-marketing`, `H1-lint-marketing` | `pnpm --filter marketing run lint` | The exit code at `H1` equals the exit code at `H0`. | A new lint failure from the bump shows as a difference. |
| `H0-vitest-list`, `H1-vitest-list` | `pnpm --filter marketing exec vitest list --filesOnly` | See lesson L8. | |
| `G3-edit` (no gate) | Green edits the two `package.json` files to `TARGET` | `git diff --stat` shows exactly those two files. | |
| `H1-install-refresh` | `pnpm install --no-frozen-lockfile` | Exit 0. The log holds `peer_line_count`. If the job hits the cap (exit 124), split it. Do not edit `pnpm-workspace.yaml`. | A "no mature matching version" error stops the task: ask the PM. Do not add `minimumReleaseAgeExclude`. |
| `H1-install` | `pnpm install --frozen-lockfile` (the Cloud Build form) | Exit 0. The lockfile is up to date. | Edit one specifier in a scratch copy: the command must fail. |
| `H1-types-marketing`, `H1-types-fixture` | as `H0` | Exit 0 and `DIAGNOSTICS=0`, or equal to `H0`. | A new diagnostic is a vinext type change. The TypeScript 7 trial must not blame it on TypeScript 7. |
| `H1-build-marketing`, `H1-build-fixture` | as `H0` | Exit 0 and `NEWFILES` is 1 or more. | as `H0` |
| `H1-probe-fixture` | as `H0` | `HTTP_STATUS=200` and the marker. | as `H0` |
| `H1-verify-marketing` | `MARKETING_RUNTIME_SMOKE_PORT=<port> node apps/marketing/scripts/verify-vinext-runtime.mjs`, after the log lines `PORT_FREE=1` | Exit 0. The script answers 200 on `/` and 401 on `/api/campaigns`. | A squatter on the port: the adversarial role tests it (5a.9). |
| `H1-time-marketing`, `H1-time-fixture` | the timed loop of 5a.7 | as `H0` | |
| `H1-test` | as `H0` | Exit 0. Counts follow `test_vitest_counts_match_logs`. | |
| `H1-seed-lint` | Seed A: add the untracked file `apps/marketing/app/__p3_seed__.ts` with the line `debugger;` (error level). Run the marketing lint script. Seed B: replace the file text with `const p3Unused = 1;` (warning level). Run the script again. Remove the file in a `trap`. | `SEED_A_EXIT` is non-zero. `SEED_B_EXIT=0` and `SEED_B_WARNINGS` is 1 or more: the shared config sets `no-unused-vars` to `warn`, and the script has no `--max-warnings`. Record that as a finding. The log holds `SEED_REMOVED=1` and `git status` shows no change. | Run with no seed: the exit must equal `H1-lint-marketing`. Lessons L2 and L3. |
| `H1-seed-tsc` | The same, with `const p3: number = "a";` in `apps/marketing/app/__p3_seed__.ts`. Run `check-types`. | Exit is non-zero and the log holds `SEED_CODE=TS2322`. `SEED_REMOVED=1`. | Lesson L6. |
| `H1-check-marketing` | `pnpm --filter marketing exec vinext check` | Informational. Record the exit and each issue class. It never fails the gate. | Lesson L15. |
| `H1-why-next` | `pnpm --filter marketing why next` and `pnpm --filter activity-vinext-fixture why next`, at `H0` and `H1` | The output at `H1` equals the output at `H0`. | Lesson L13. |
| `H1-browser-marketing`, `H1-browser-fixture` | Start `vinext start` for each app on a free port. Open `/` in a browser. Read the console. | `BROWSER_TOOL=<name>`, `CONSOLE_ERRORS=0`, `HYDRATION_WARNINGS=0`. The fixture check control gives a visible result. | A tool of `none` ends `blocked` (lesson L9). |
| `R-rollback` | The rollback of 5a.8, after the Green commit | `ROLLBACK_BYTES_EQUAL=1` and `REAPPLY_BYTES_EQUAL=1`. | A wrong path gives 0 and fails. |

Order: `P-install-base`, `P-prereq-build`, the `H0` rows, `G3-edit`, `H1-install-refresh`,
`H1-install`, the `H1` rows, the Green commit, `R-rollback`. Heavy steps run one at a time. A gate
may merge with another only if it keeps its own log and exit code. Each job must finish in less than
1800 s. If a job hits the cap, split it by app or by test folder. Do not raise the priority.

### 5a.7 Build-time method (before and after)

Both conditions use the same worktree, the same Node (24.19.0), the same install state, and no
other heavy job. The `H0` condition has vinext 1.2.0. The `H1` condition has `TARGET`.

1. The gate build (`H0-build-*` or `H1-build-*`) runs first. It fills the caches the same way for
   both conditions. It is not a timed run.
2. One `HR` job per app and per condition runs the timed loop. It runs inside the job, so a lock
   wait is not part of the value:

   ```
   for i in 1 2 3; do
     rm -rf apps/<app>/dist
     wait until load1 (from /proc/loadavg) is 1.5 or less, for at most 600 s
     L=$(cut -d' ' -f1 /proc/loadavg); S=$(date +%s%N)
     pnpm --filter <app> exec vinext build >"run-$i.log" 2>&1; RC=$?
     E=$(date +%s%N)
     echo "BUILD_RUN=$i EXIT=$RC MS=$(( (E-S)/1000000 )) LOAD1_START=$L NEWFILES=$(find apps/<app>/dist -type f -newermt "@$((S/1000000000))" | wc -l) VINEXT=$(node -p "require('vinext/package.json').version")"
   done
   ```

3. The loop times `vinext build` alone. It leaves out the verify script, whose server start
   adds a fixed delay. The gate build runs the whole `pnpm --filter marketing build` once.
4. A run is valid when four rules hold. `EXIT=0`. `NEWFILES` is 1 or more. `LOAD1_START` is 1.5 or
   less. `VINEXT` equals the condition (1.2.0 at `H0`, `TARGET` at `H1`). A run that fails a rule is
   invalid. Repeat it. Record each repeat.
5. The note block `build-times` holds these values for each app: the three `MS` values before, the
   three after, and the two medians. It also holds `ratio` (the after median divided by the before
   median, two decimals) and `performance_finding`. `performance_finding` is true when the ratio is
   above 1.00. A slower result is a finding. It is not a regression. The plan text "Math reports 2
   to 3 times faster" is not a claim of this task (A6).

The test `test_build_times_recomputed` reads the labeled lines from the logs. It recomputes the
medians and the ratio. It fails in three cases. The note differs from the logs. A run is invalid or
a `VINEXT` label does not match its condition. `performance_finding` does not follow the ratio
(A3, A5).

### 5a.8 Oxc lessons and rollback

Source: `/home/daniebo/Desktop/ra-math-advantage/measure/archive/vinext-oxc-toolchain_20261114/oxc-evidence.md`,
sections 6, 8, and 11. The role reads it only. The block `oxc-lessons` holds one row for each
lesson id below, with `disposition` (`check` or `defer`), `result` or `reason`, and `gate` or
`owner`. A `check` row names an existing gate log. A `defer` row has a reason of 20 characters or
more and an owner (a plan task or `tech-debt`).

| Id | Math source | Disposition | What Green records, or the reason |
| --- | --- | --- | --- |
| L1 | §6 S2 Green record | **check** (light) | `rg -n 'oxlint' <manifests>` finds 0 hits (exit 1). No `.oxlintrc.json` exists. Math found no rule gap because no ESLint config remains. Here the ESLint config remains (`packages/config/eslint`, `apps/marketing/eslint.config.mjs`). Record both facts. |
| L2 | §11 Lint | **check** | Gate `H1-seed-lint`: seed A (error level) makes the lint script exit non-zero. Seed B (warning level) exits 0, so the script does not enforce zero warnings. `H1-lint-marketing` equals `H0-lint-marketing`. |
| L3 | §11 Lint, order step 3 | **defer** | Oxlint, a root `.oxlintrc.json`, and `--max-warnings 0` in the lint scripts. Reason: a tool migration and a script change are outside a pins-only task. Seed B shows the gap. Owner: Phase 5 task "Move linting off the TypeScript 5 API". |
| L4 | §11 Format, order step 5 | **defer** | oxfmt, a format-only commit, and `.git-blame-ignore-revs`. Reason: a repo-wide reformat touches thousands of files. The formatter today is Prettier (catalog). Owner: a separate formatting decision by the PM. |
| L5 | §11 Type check, order step 4 | **defer** | `TSRS_FAST=1 oxlint --type-aware --type-check`. Reason: the spec keeps tsrs out (FR-4, Out of Scope), and oxlint is not installed. Owner: none in this track. |
| L6 | §11 Type check | **check** | Gate `H1-seed-tsc`: the named fallback `tsc --noEmit` (the only type-check line here) reports TS2322 on a seeded probe. Record `SEED_CODE=TS2322`. |
| L7 | §8 heavy-run 1800 s cap | **check** | Each gate log has `ELAPSED_S` below 1800 and no exit 124. A gate that hit the cap shows how Green split it. |
| L8 | §8 vitest `include` gap | **check** | Compare `git ls-files 'apps/marketing/**/*.test.*'` with the `vitest list --filesOnly` output. Unmatched files must be 0, or each is a row with a reason. The `H1` file count is not below `H0` (A4). |
| L9 | §8 missing browser tool | **check** | Record `BROWSER_TOOL=<name or none>` (try `agent-browser`, then the repo Playwright, then the OpenChamber browser). `none` ends `blocked`. |
| L10 | §8 `vinext build` changes tracked files | **check** | After each build run `git status --porcelain --untracked-files=no`. Record `TRACKED_CHANGED=<n>` and the names. Also record each new untracked folder (for example `.vinext/`). Restore tracked files with `git checkout -- <path>` before the commit. Stage none of them. |
| L11 | §8 `vinext build` (ignore and commit) | **defer** | A `.gitignore` entry for `.vinext/`, and a commit of the generated `next-env.d.ts`. Reason: both are outside the pins-only scope, and the owner holds uncommitted edits of both files in the main checkout. Owner: `tech-debt` (append-only row). |
| L12 | §8 `eslint-config-next` config load | **check** | `rg -n 'eslint-config-next' apps/marketing apps/activity-vinext-fixture packages/config` finds 0 hits (exit 1). The lint gate loads its config with the same exit as `H0`. |
| L13 | §8 dead dependency reinstalls `next` | **check** | `rg` finds no `next` or `eslint-config-next` declaration in the two manifests. `H1-why-next` equals the `H0` output. Record the cause of `next` in the marketing tree: the peer in `packages/api/package.json:73`. |
| L14 | §8 removal of `next` | **defer** | Removing `next` from overrides and manifests. Reason: `packages/api` has `next` as a required peer, and other apps declare it. A removal changes files outside this task. Owner: none in this track. |
| L15 | §8 `vinext check` | **check** | Gate `H1-check-marketing`. Informational: record the exit and the issue classes. It never fails the task. |
| L16 | §8 no Vite config, and the `next/*` alias map | **check** | Both `vite.config.ts` files exist and call `vinext()`. Each alias target of `apps/marketing/vitest.config.ts` exists in 1.4.6 (`test_hardcoded_vinext_paths_exist`). |
| L17 | §8 TypeScript 7 rows (`typescript6` alias, `@typescript/native` bin shadow, tsconfig sweep, `tsc` heap) and tsrs rows (platform binary, scope) | **defer** | Reason: they need a TypeScript 7 install. Owner: the later Phase 3 tasks (trial install and type checks). The tsrs rows stay out of the track. |
| L18 | §8 rows that only Math has (Playwright `webServer`, `gates.sh` helper, S2 Red exception, ESLint "before" timing, npm re-resolve), and §11 order steps 2, 6, 7 | **defer** | Reason: this repository has no such script, uses exact pnpm pins, and plans steps 2, 6, and 7 in later tasks. Owner: the later Phase 3 tasks and Phase 5. Record `rg -n 'webServer' apps/marketing apps/activity-vinext-fixture` (exit 1) so the row is not empty (A4). |

`test_oxc_lessons_complete` requires exactly 18 rows with the ids L1 to L18 (a labeled integer, A3).
The expected row count changes only if a strategy amendment changes this table.

**Rollback.** The `rollback` block holds the command and a proof. The command has two forms.

Before the Green commit merges:

```
git checkout <role_base_sha> -- apps/marketing/package.json apps/activity-vinext-fixture/package.json pnpm-lock.yaml \
  && pnpm install --frozen-lockfile
```

After it merges: `git revert <green sha>`, then `pnpm install --frozen-lockfile`. No deploy and no push.
Here `<role_base_sha>` is the commit just before the Green commit. The gate `R-rollback` runs the
file restore from the first form, checks `git diff --quiet <role_base_sha> -- <three paths>` and
that the manifest text shows `"vinext": "1.2.0"`, and prints `ROLLBACK_BYTES_EQUAL=1`. It then
restores the Green commit with `git checkout HEAD -- <three paths>` and prints `REAPPLY_BYTES_EQUAL=1`.
Byte-equal files give the same frozen install as `H0`, so the gate needs no second install. The
test `test_rollback_proven` checks the command text names all three paths, both labels are 1, and
the `H0` logs show `VINEXT=1.2.0`.

### 5a.9 Order of work, closeout, adversarial attacks, and anti-pattern coverage

**Order of work.**

1. **Orchestrator.** Set the task to `[~]` (A8; section 8, question 5). Capture `phase_base_sha`
   (5a.4).
2. **Red** (light). Commit the test file. Run `RED_TEST_COMMAND`. Report `N` and the green guards.
3. **Green, light.** Gate G3.0 (5a.3). Write `peer-check-p3` and `pin-inventory`.
4. **Green, heavy.** `P-install-base`, `P-prereq-build`, the `H0` rows.
5. **Green, edit.** Edit the two manifests. Run `H1-install-refresh` and `H1-install`.
6. **Green, heavy.** The `H1` rows. Write `build-times`, `oxc-lessons`, `lock-key-changes`, and
   `gate-results-p3`.
7. **Green, commit.** Stage only the allowed paths (5a.5). Run `R-rollback`. Write the Green log
   `green-p3-<sha>.log` and the `rollback` block.
8. **Gate.** The orchestrator runs `GREEN_TEST_COMMAND` with the full `P3_GREEN_COMMITS` list and
   records the list in its run log.

**Closeout.** `plan.md` marks the task `[x]` with the commit SHA and the note path, only after the
gate exits 0 (A6). The text says "bumped" and never "upgraded in production". The manual
verification task of Phase 3 stays open until the other tasks end. The Green commit does not merge
to master before the orchestrator records the waiver of 5a.3 in `plan.md`. The `H1` type, build,
and test rows are the base for the 5.9.3 control of the later trial.

**Intentionally red tests after Green (aggregate-suite handling).** The Phase 2 module asserts the
Phase 2 end state (vinext 1.2.0). The bump changes that state on purpose. Under default C these six
Phase 2 tests fail after Green:

- `P2T2DeclarationTests.test_both_apps_declare_candidate`
- `P2T2DeclarationTests.test_lock_importers`
- `P2T2DeclarationTests.test_lock_has_no_old_version`
- `P2T2DeclarationTests.test_installed_matches_declared`
- `P2T2PeerGuardTests.test_installed_peers_satisfied` (React 19.2.9 against `^19.3.1`)
- `P2T3ResolvedNoteTests.test_resolved_after_matches_disk`

The module is history of a closed phase. Nobody edits it. Nobody edits the Phase 2 note. The
orchestrator runs this regression command after Green and compares the failure names with the list
above. The failure set must equal the list. A missing name means the bump is absent. An extra name
is a regression (A7). The command skips `P2T2ScopeTests`, which needs the Phase 2 commit list.

```
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \
  measure.tests.test_typescript7_native_migration_phase2.P2CheckerTests \
  measure.tests.test_typescript7_native_migration_phase2.P2T1PeerNoteTests \
  measure.tests.test_typescript7_native_migration_phase2.P2T2DeclarationTests \
  measure.tests.test_typescript7_native_migration_phase2.P2T2PeerGuardTests \
  measure.tests.test_typescript7_native_migration_phase2.P2T2ScopeRuleTests \
  measure.tests.test_typescript7_native_migration_phase2.P2T2BookkeepingRuleTests \
  measure.tests.test_typescript7_native_migration_phase2.P2T3ResolvedNoteTests
```

Under option A or B the list changes. The orchestrator recomputes it from the same command. A
`measure/tests` run is not part of a CI aggregate gate today (`rg` finds no call in the workflows,
`measure/doctor.sh`, or `package.json`). If that changes, add the six names as a known failure.

**Adversarial attacks** (narrow). The role gate uses the `H1-test` command as `PROJECT_TESTS`.

1. Set the lock specifier of one app to `1.4.5` and confirm `test_lock_importers_resolve_target`
   and `pnpm install --frozen-lockfile` fail.
2. Leave a stale `dist/` and confirm `NEWFILES=0` fails the build gate.
3. Start a squatter on the verify port that answers 200 on `/` and 401 on `/api/campaigns`. Run the
   verify script. The script may pass falsely, because it polls the port and checks the child exit
   only. If it does, report a finding for tech debt. Do not edit the script (it is the oracle).
4. Flip the React row of `peer-check-p3` to `met` and confirm `test_peer_rows_recomputed` fails.
5. Add a third manifest that declares vinext and confirm the exact-two test fails.
6. Add a `build-times` run with `VINEXT=1.2.0` under the `H1` label and confirm the label check fails.
7. Touch `pnpm-workspace.yaml` in a scratch Green commit and confirm `test_denied_paths_untouched` fails.
8. Request `/api/campaigns` with no cookie, a malformed cookie, and a forged header. Each answer must
   be 401.

**Anti-pattern coverage for this task.**

| Anti-pattern | Defense in this task |
| --- | --- |
| A3 | Counts are labeled: `BUILD_RUN=`, `EXIT=`, `ELAPSED_S=`, `DIST_MISSING=`, `Test Files  N passed (N)`, `Tests  M passed (M)`. The vinext declaration count is exactly 2. The lesson count is exactly 18. |
| A4 | Empty rows fail: the pin inventory (3 or more), the peer rows (6 or more), the lessons (18), and the alias paths (7 or more). `P3_GREEN_COMMITS` unset fails. A build with no new file fails. A test run with fewer files than `H0` fails. |
| A5 | The note repeats nothing it cannot cite. Each repo value cites `path:line`. Each gate claim matches the labeled lines of its log. The tests recompute the medians, the ratios, and the lock key sets. The fixture row says "no test script". |
| A6 | `plan.md` says "bumped" only after the gate exits 0. A "not met" peer is never written as "met". The Math speed claim is not copied into this task. |
| A7 | Failures compare by file and name. Warning and peer counts use whole logs with no pre-filter. The Phase 2 expected-red check compares names, not a count. |
| A8 | The orchestrator sets `[~]` before Red. |
| A9 | The test file uses `track_dir_resolve`. |
| A14 | Every `rg` detector treats exit 2 as a failure. Exit 1 with no output means 0 hits. |
| A16 | A16 forbids a worktree. The brief and section 8, question 10 record the exception. The main checkout holds uncommitted owner edits, and no role works in it. |

### 5a.10 Evidence note and files

The note is `evidence/phase3-vinext-1-4-6.md`. Raw logs are in `evidence/phase3/raw-logs/`. The note
holds seven fenced JSON blocks, each with the name given here:

| Block | Content |
| --- | --- |
| `peer-check-p3` | The registry output, the peer rows, the dependencies, and the `waiver` object if a row is "not met". |
| `pin-inventory` | Each tracked file that names `vinext`, with `kind` and `changed`. |
| `lock-key-changes` | The `packages:` keys added and removed, and each `explained_drift` entry. |
| `gate-results-p3` | One entry for each gate id, with `command`, `exit`, `log`, `start_epoch`, and the counts. |
| `build-times` | The values of 5a.7 for each app. |
| `oxc-lessons` | The 18 rows of 5a.8. |
| `rollback` | The two command forms and the proof labels. |

The note also names the resolved `vinext`, `vite`, and `react` versions and the commands that
reproduce them (`pnpm why vinext`, `pnpm why vite`, `pnpm why react`). The note adds no hash field.

## 6. Phase 4 outline: Cloudflare preparation

The full section comes before Phase 4 starts. Phase 4 changes no code. Its deliverable is
`cloudflare-node-inventory.md` and a checker.

**What makes the inventory complete.** A hand-made list is not enough. The inventory uses two
independent passes, and a script compares them:

1. **Manifest pass.** A script reads every `package.json` in the repository (apps, packages, and
   `services/`). It lists each `dependencies` and `optionalDependencies` entry. It classifies a
   dependency as Node-only when one of these holds: the installed package declares `gypfile`, a
   `binary` field, or `os`/`cpu` fields; the name starts with `@node-rs/`; the package has
   platform-binary optional dependencies (for example `sharp`); or the name is in the A-49 study
   list. Every other dependency is `workers-ok` or `unreviewed`. The count of `unreviewed` must be
   0.
2. **Source pass.** A second script uses `rg -n` and `build-graph` to find imports of Node
   built-ins that Workers do not support (`fs`, `net`, `tls`, `child_process`, `dns`, `http2`,
   `cluster`) and imports of each Node-only package. Use no `rg -nE` (A14).

**Checks (Python, standard library).**

- Every manifest-pass Node-only pair `(workspace, dependency)` has a row. A deleted row fails.
- Every source-pass import of a Node-only package maps to a row. An import with no row fails.
- Each row has `path:line` for the `package.json` line. That line contains the dependency name.
  Each row has at least one import site or the exact text `no import site found`.
- The row count equals the number of distinct pairs (labeled integer, at least 1; A3, A4).
- A fake dependency added to a scratch manifest raises the manifest-pass count and fails the
  comparison.

**Adapter plan checks.** For `packages/db`, storage, auth, and integrations, a script counts
direct app imports (`rg -c` over `apps/` for the package specifiers). The plan and the answer
cite those numbers. Review A re-runs the script. A number in the text that differs from the
script output fails (A5). The answer to Daniel's question 3 names the separate Cloudflare track
as owner of the move. It does not say "ready" for any area without a count (A6).

**No code moved.** Each Green commit of the phase touches only files under this track folder and
`measure/tests/`. The check lists the paths of the named commits and not a range (concurrent
Storytime commits).

**Roles (planned).** Review A: yes. Review B: skip (documents only). Review C: skip. Adversarial:
yes, against the completeness checker (delete a row, change a line number, add a fake
dependency). UX browser: skip. Risk: low. The main risk is a wrong claim, not a code defect.

## 7. Phase 5 note: gated rollout

Every Phase 5 task is `[b]` with `deferred:daniel`. No strategy section is written now. The
strategy role writes it after Daniel decides on the Phase 3 report. That section must cover at
least: `pnpm install --frozen-lockfile`, one `typescript` major in `pnpm why typescript`, no new
`@ts-ignore`, `@ts-nocheck`, or `ignoreBuildErrors`, a pinned Oxlint rule set, three observed CI
runs, and one rollback command. Risk will be high or critical for the CI and lint tasks.

## 8. Open questions and defaults

| # | Question | Default (in force until answered) |
| --- | --- | --- |
| 1 | vinext 1.4.3 needs React `^19.3.1`. The repository uses React 19.2.9 in every app. Which option? (a) Use the newest 1.x whose peers fit the current repository (vinext 1.2.0 looks right: React `^19.2.6`, and the plugin-rsc peer is optional; Task 1 must verify). (b) Move React to 19.3.1 for the whole repository, in its own track. (c) Skip Phase 2 and start Phase 3 on 0.2.0. | Task 1 runs and records the result. Phase 2 then stops. The orchestrator asks the PM. Strategy recommendation: option (a), because it keeps the change inside the two apps and reaches vinext 1.x. If Daniel requires "current" (1.4.3), choose (b) as a separate track. |
| 2 | A16 forbids a worktree. The plan requires a trial worktree in Phase 3. May Phase 3 use one? | Yes. The plan and the spec are newer than A16 and name the worktree. The orchestrator records the exception in the Phase 3 run log. The repository already has 8 worktrees, so A16 is not enforced today. |
| 3 | Phase 3 needs a 5.9.3 control run (RSS, time, tests) in the worktree. Is the extra heavy time acceptable? | Yes. Without it the memory table and the test classification are not valid. |
| 4 | The spec says "after 22:00 ICT" but gives no end time. | **Superseded 2026-11-28** (PM, 07:35): the window is lifted. The old default (end at 06:00 ICT) applied to Phase 2 only. |
| 5 | The plan marks tasks `[ ]`. The A8 rule and the Mid Red gate need `[~]`. | The orchestrator's plan-update step sets the current task to `[~]` before Mid Red. |
| 6 | The commit header in the task text is 103 characters. The limit is 100. | Use `docs(measure): rewrite the ts7 test strategy (track_id: typescript7_native_migration_20260710)` (94 characters). |
| 7 | vinext 1.4.6 needs React `^19.3.1`. The repository pins React 19.2.9, and a root test and `measure/tech-debt.md:25` guard that pin. The PM asked for 1.4.x and did not name React. Which option? (A) stay on 1.2.0; (B) move React repo-wide in its own track; (C) install 1.4.6 under React 19.2.9, record the unmet peer, and let live gates decide; (D) use 1.4.7. | **C**, under the three conditions of 5a.3. AGENTS.md section 5 says to act on the default and report it. The PM can reverse it. Recommendation if C fails or the PM wants a clean peer: B in its own track. |
| 8 | The plan names 1.4.6 as "the latest 1.4.x". The registry now shows 1.4.7 (published 2026-11-26). Which version? | 1.4.6, as the PM and the done-when text name it. The peers are the same. One constant (`TARGET`) changes if the PM wants 1.4.7. |
| 9 | The bump makes six Phase 2 tests fail on purpose (5a.9). Edit them or freeze them? | Freeze them. The module is history of a closed phase. The orchestrator checks the failure names against the list in 5a.9. |
| 10 | A16 forbids a worktree, and the main checkout holds uncommitted owner edits of two `next-env.d.ts` files. Where does Green work? | In a dedicated worktree from the `phase_base_sha`, with its own install. The orchestrator records the A16 exception. Each heavy job stays under 1800 s. |
| 11 | `spec.md` (Constraints, "Time window") and the `plan.md` header still say heavy steps run after 22:00 ICT. | `plan.md` carries a "Lifted 2026-11-28 (PM)" line. `spec.md` is not edited here. The owner of the spec may add the same line. |
