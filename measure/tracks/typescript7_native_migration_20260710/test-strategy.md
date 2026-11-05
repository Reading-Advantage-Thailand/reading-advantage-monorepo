# Test Strategy: TypeScript 7 Native Compiler Migration (one-compiler design)

Revision: 2026-11-05 amendment. role_base_sha: `0daf3547808319142ae02a3f62d61c3c7aed78c4` (the
commit that rewrote `spec.md` and `plan.md`). Author model: claude-code/claude-sonnet-5-5.

This strategy covers the amended plan: Phase 2 (vinext 1.x), Phase 3 (TypeScript 7 trial), Phase 4
(Cloudflare preparation), and Phase 5 (gated rollout). Phase 2 has the full section. Phases 3 and 4
have outlines. The full sections come before each phase starts. Phase 5 waits for Daniel.

## Contents

- [Superseded history](#superseded-history-2026-11-05)
- [1. Constraints for every phase](#1-constraints-for-every-phase)
- [2. phase_base_sha capture point](#2-phase_base_sha-capture-point)
- [3. Anti-pattern vocabulary used here](#3-anti-pattern-vocabulary-used-here)
- [4. Phase 2: vinext 1.x upgrade (full section)](#4-phase-2-vinext-1x-upgrade-pm-step-0)
- [5. Phase 3 outline](#5-phase-3-outline-typescript-7-trial)
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
| Time window | For this track, heavy steps run only after 22:00 ICT. The end of the window is 06:00 ICT (default; see section 8, question 4). |
| Storytime priority | Start a heavy step only when no Storytime heavy run waits. If `heavy-run.sh` names a Storytime holder, stop and wait. Storytime keeps the priority. |
| Memory | The machine has 7 GB of memory. Run vitest with `--maxWorkers=1`. Run no second heavy job at the same time. |
| Pipes | A heavy command that pipes to `tee` starts with `set -o pipefail;`. Without it the exit code of the tool is lost. |
| No push, no deploy | This holds for every phase. A deploy command or a `git push` in any gate is a failure. |
| No new hash | Add no hash field, checksum, or manifest hash (AGENTS.md hashing policy). Lockfile integrity lines are normal lockfile content and are not new fields. |
| Staging | The repository has many untracked files from other sessions. Every commit names its paths. A Storytime role commits on master at the same time. |
| Worktrees | Phases 2 and 4 use the shared master tree only (A16). Phase 3 needs one trial worktree. See section 5 and section 8, question 2. |

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
| `P2T2ScopeTests.test_green_commits_in_scope` | red (env unset) | The environment variable `P2_GREEN_COMMITS` lists the Green commits. Each commit touches only: the two app folders, `pnpm-lock.yaml`, the evidence folder of this track, and `plan.md` of this track. The test **fails** when the variable is unset or empty (A4). A touched app file other than `package.json` needs an `app_changes_justified` entry in the note with a build log reference. | Add a stray file to a scratch commit: fail. |
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
  exits 0, and all `H1-*` rows exit 0.
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

## 5. Phase 3 outline: TypeScript 7 trial

The full section comes before Phase 3 starts. These points are fixed now.

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
| 4 | The spec says "after 22:00 ICT" but gives no end time. | The window ends at 06:00 ICT. |
| 5 | The plan marks tasks `[ ]`. The A8 rule and the Mid Red gate need `[~]`. | The orchestrator's plan-update step sets the current task to `[~]` before Mid Red. |
| 6 | The commit header in the task text is 103 characters. The limit is 100. | Use `docs(measure): rewrite the ts7 test strategy (track_id: typescript7_native_migration_20260710)` (94 characters). |
