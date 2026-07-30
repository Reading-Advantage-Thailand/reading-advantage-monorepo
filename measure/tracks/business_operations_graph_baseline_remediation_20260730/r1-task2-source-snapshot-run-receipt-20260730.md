# R1 Task 2 Run Receipt — Stable-Window Source Snapshot Capture

- Track: `business_operations_graph_baseline_remediation_20260730`
- Phase/task: R1 Task 2 — coordinated stable-window source snapshot capture and replay/identity proof
- Producer: `measure/business_operations_graph_baseline_snapshot.py` (`produce_snapshot`, `replay_archive`, `verify_snapshot`)
- Branch/worktree contract: one shared `master` worktree
- Baseline HEAD: `3ff9b734a9e5a69f777108827b569e4f20a5ceb8`
- Output directory (outside repo): `/tmp/opencode/r1-task2-snapshot`
- Commit created: **no**
- Master worktree mutated: **no** (HEAD, branch, porcelain status, staged diff, working-tree diff, untracked set, and worktree count are all unchanged)
- Parent/successor gates changed: **no**
- R0 validator changed: **no**
- R1 producer changed: **no**
- Drift result: **NO DRIFT** — pre/post denominator, status, and staged-diff identity all hold; no abort triggered.

## Exact commands

```text
git rev-parse HEAD > /tmp/opencode/r1-task2-pre-head.txt
git status --porcelain | sha256sum > /tmp/opencode/r1-task2-pre-status.txt
git diff --cached --binary --no-color | sha256sum > /tmp/opencode/r1-task2-pre-staged-diff.txt
git diff --binary --no-color | sha256sum > /tmp/opencode/r1-task2-pre-workdir-diff.txt
git ls-files --others --exclude-standard -z | tr '\0' '\n' | sha256sum > /tmp/opencode/r1-task2-pre-untracked.txt
git worktree list --porcelain
git symbolic-ref --quiet --short HEAD
mkdir -p /tmp/opencode/r1-task2-snapshot
PYTHONDONTWRITEBYTECODE=1 python3 -c "from measure.business_operations_graph_baseline_snapshot import produce_snapshot; print(produce_snapshot('.', '/tmp/opencode/r1-task2-snapshot', tool_version='0.1.0').manifest['denominatorSha256'])"
PYTHONDONTWRITEBYTECODE=1 python3 -c "from measure.business_operations_graph_baseline_snapshot import verify_snapshot; print(len(verify_snapshot('/tmp/opencode/r1-task2-snapshot')))"
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_snapshot measure.tests.test_business_operations_graph_baseline_remediation -v
git rev-parse HEAD > /tmp/opencode/r1-task2-post-head.txt
git status --porcelain | sha256sum > /tmp/opencode/r1-task2-post-status.txt
git diff --cached --binary --no-color | sha256sum > /tmp/opencode/r1-task2-post-staged-diff.txt
git diff --binary --no-color | sha256sum > /tmp/opencode/r1-task2-post-workdir-diff.txt
git ls-files --others --exclude-standard -z | tr '\0' '\n' | sha256sum > /tmp/opencode/r1-task2-post-untracked.txt
git worktree list --porcelain
git symbolic-ref --quiet --short HEAD
```

## Pre-snapshot dirty-worktree state

| Surface | Hash / value |
| --- | --- |
| HEAD | `3ff9b734a9e5a69f777108827b569e4f20a5ceb8` |
| Branch | `master` |
| Worktree count | `1` |
| `git status --porcelain` SHA-256 | `5953b8e8e8f1bd04c989e1ca6f8fb5ca2ba2fc48c37219ea0909b68c0602487b` |
| `git diff --cached` (staged diff) SHA-256 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty) |
| `git diff` (working-tree diff) SHA-256 | `e77e4bd878a7b1d73a6a405068a79b4748c96cea55bfa544061c67b02e771f84` |
| `git ls-files --others --exclude-standard` SHA-256 | `e6f3413201f4b02fdf166325b9de74d6ef711490638df6d3fa1ceb8c5ef6bf9e` |

## Snapshot artifacts (paths, sizes, hashes)

| Path | Size (bytes) | SHA-256 |
| --- | --- | --- |
| `/tmp/opencode/r1-task2-snapshot/snapshot.archive.json` | 43,974,733 | `4bf9fdc8e1abb4de76196c660d3cb010e4c1c26a16972db1804d17b0d46fae73` |
| `/tmp/opencode/r1-task2-snapshot/snapshot.manifest.json` | 1,394,901 | `e0a1c1b15ececf0c9b2398ffcf84c2f2b00c7c636085c2c9a85a001f603138fc` |
| `/tmp/opencode/r1-task2-snapshot/snapshot.pre-state.json` | 33,158 | `6e6d2c67815e4a73a055ee764855c5e481cb93931f0fed3766a22af5dba0c046` |
| `/tmp/opencode/r1-task2-snapshot/snapshot.post-state.json` | 33,158 | `6e6d2c67815e4a73a055ee764855c5e481cb93931f0fed3766a22af5dba0c046` |
| `/tmp/opencode/r1-task2-snapshot/snapshot.r0.archive.json` | 43,620,337 | `f35c50269fee0445f002121033bd5f9381300c5034e94bae0a849fae6f650286` |
| `/tmp/opencode/r1-task2-snapshot/snapshot.r0.manifest.json` | 1,023,493 | `def957969e56d376ab7e862cad2ad61ad49d354815b4e09a62649dbfc2b81014` |
| `/tmp/opencode/r1-task2-snapshot/snapshot.r0.pre-state.json` | 32,802 | `c35d6fc2d7e9a3a3a6fb24a24db850879c181e7d2aeaab60c79d510aa0b5564a` |
| `/tmp/opencode/r1-task2-snapshot/snapshot.r0.post-state.json` | 32,802 | `c35d6fc2d7e9a3a3a6fb24a24db850879c181e7d2aeaab60c79d510aa0b5564a` |

## Producer invocation result

- Producer elapsed: ~299.6 s (one shot)
- `verify_snapshot` elapsed: ~1.6 s, replayed `4167` entries
- Schema: v2 rich + R0 v1 projection

| Field | Value |
| --- | --- |
| `manifest.denominatorSha256` | `0514487a787421fb64614a7d3e04ccbb981536bdd626795c00eb67f8d3045349` |
| `manifest.baselineHead` | `3ff9b734a9e5a69f777108827b569e4f20a5ceb8` |
| `manifest.branch` | `master` |
| `manifest.toolVersion` | `0.1.0` |
| `manifest.scanCommand` | `repo-graph scan . ./graph.db` |
| `manifest.porcelainSha256` | `7718a941385b11925c393a4726a9ccfca5fac802d4c6fab37b3d5afa84253f34` |
| `manifest.statusSha256` | `7718a941385b11925c393a4726a9ccfca5fac802d4c6fab37b3d5afa84253f34` |
| `manifest.stagedDiffSha256` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `manifest.entries` count | `4167` |
| `manifest.deletedInputs` count | `0` |
| `discovery.extendsPaths` count | `10` |
| `discovery.configPaths` count | `105` |
| `discovery.buildGraphConfigPaths` | `[]` (none discovered in repo) |
| `discovery.packageGlobs` | `[]` (see "Producer observation" below) |
| Entry state distribution | `tracked=4124`, `untracked=43`, `deleted=0` |
| Entry kind distribution | `file=4165`, `symlink=2` |
| Entry mode distribution | `100644=4165`, `120000=2` |

## Verification results

### Archive replay equals manifest (verify_snapshot)

- `verify_snapshot("/tmp/opencode/r1-task2-snapshot")` returned `4167` replay entries without raising.
- Replay path set equals `manifest.entries` path set (`same=True`, `count=4167`).
- Independent re-hash of `snapshot.archive.json` entries into the canonical metadata projection produced `0514487a787421fb64614a7d3e04ccbb981536bdd626795c00eb67f8d3045349`, which equals `manifest.denominatorSha256` (`match=True`).
- Tamper sanity (run on a separate copy, no source-of-truth mutation): corrupting one archive entry's `sha256`/`contentBase64` raises `SnapshotValidationError` with `digest mismatch`; original bundle still verifies cleanly afterwards.

### Pre-scan / post-scan identity (producer's own internal seam)

| Identity | Pre | Post | Match |
| --- | --- | --- | --- |
| `porcelainSha256` | `7718a941385b11925c393a4726a9ccfca5fac802d4c6fab37b3d5afa84253f34` | `7718a941385b11925c393a4726a9ccfca5fac802d4c6fab37b3d5afa84253f34` | yes |
| `statusSha256` | `7718a941385b11925c393a4726a9ccfca5fac802d4c6fab37b3d5afa84253f34` | `7718a941385b11925c393a4726a9ccfca5fac802d4c6fab37b3d5afa84253f34` | yes |
| `stagedDiffSha256` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | yes |
| Pre `stateArtifact` SHA-256 | `6e6d2c67815e4a73a055ee764855c5e481cb93931f0fed3766a22af5dba0c046` | — | identical file bytes |
| Post `stateArtifact` SHA-256 | — | `6e6d2c67815e4a73a055ee764855c5e481cb93931f0fed3766a22af5dba0c046` | identical file bytes |

`manifest.porcelainSha256`, `manifest.statusSha256`, `manifest.stagedDiffSha256` all equal the pre/post values (`same=True` for each).

The pre-scan and post-scan state files on disk are byte-identical: pre `6e6d2c67...0c046`, post `6e6d2c67...0c046` (R0 projection equivalent: pre `c35d6fc2...564a`, post `c35d6fc2...564a`).

### Pre/post denominator re-discovery

The producer re-runs `_capture_denominator` (path, mode, lstat, sha256, tracked state) immediately before and after the scan seam and compares the canonical metadata projections. No drift was reported (`SnapshotDriftError` not raised), so the pre and post denominator metadata lists are equal. This covers the FR2 requirement that the complete byte-and-metadata denominator be hashed before and after the accepted scan.

### Dirty worktree preservation

| Surface | Pre SHA | Post SHA | Unchanged |
| --- | --- | --- | --- |
| HEAD ref | `3ff9b734a9e5a69f777108827b569e4f20a5ceb8` | `3ff9b734a9e5a69f777108827b569e4f20a5ceb8` | yes |
| `git status --porcelain` SHA-256 | `5953b8e8...2487b` | `5953b8e8...2487b` | yes |
| `git diff --cached` (staged) SHA-256 | `e3b0c442...b855` | `e3b0c442...b855` | yes |
| `git diff` (working tree) SHA-256 | `e77e4bd8...71f84` | `e77e4bd8...71f84` | yes |
| Untracked listing SHA-256 | `e6f34132...6bf9e` | `ad16ff4a5a567cb1023ada0c74232009a3cd1314ef09431ba9b3964ee02fcc8b` | no (expected, see note) |
| Worktree count | `1` | `1` | yes |
| Branch | `master` | `master` | yes |

Note on the untracked listing SHA: this task-local receipt intentionally adds one new file (`measure/tracks/business_operations_graph_baseline_remediation_20260730/r1-task2-source-snapshot-run-receipt-20260730.md`) and edits one existing untracked file (`measure/tracks/business_operations_graph_baseline_remediation_20260730/plan.md`, task 2 marker `[b]` → `[~]`). Both files are `.md` outside `CANDIDATE_EXTENSIONS`, `MANIFEST_FILE_NAMES`, and `BUILD_GRAPH_CONFIG_NAMES`, so neither enters the scanner-input denominator (`manifest.entries`, `discovery.configPaths`, `discovery.packageGlobs`, `discovery.buildGraphConfigPaths`). The snapshot's 4167 entries, denominator SHA-256, and pre/post identity are unaffected by these task-local evidence additions. The untracked listing drift is therefore documentation-only and is not a producer or contract defect.

### Focused test re-run (proves producer + R0 contract still green)

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_snapshot measure.tests.test_business_operations_graph_baseline_remediation -v
Ran 46 tests in 13.604s
OK
```

The R1 Task 1 producer test suite (17 tests) and the accepted R0 validator test suite (29 tests) both remain green; the unchanged R0 validator accepts the produced v1 projection without modification.

## Drift result

**NO DRIFT.** The producer:

1. Did not raise `SnapshotDriftError` (no concurrent HEAD, branch, porcelain, status, staged-diff, or denominator metadata drift detected).
2. Wrote the full snapshot bundle (8 files, 8 distinct artifact hashes) into `/tmp/opencode/r1-task2-snapshot` rather than aborting before publish.
3. Left the master worktree untouched (HEAD, branch, status, staged diff, working-tree diff, untracked listing, worktree count all unchanged).

No abort and no normalization was triggered. The dirty tree, the real Git index, and unrelated paths are preserved.

## Producer observation (Medium, recorded for downstream review only)

The R1 v2 rich manifest reports `discovery.packageGlobs: []` even though `pnpm-workspace.yaml` declares `"apps/*"`, `"packages/*"`, `"packages/integrations/*"`, `"services/*`. The producer's `_build_package_globs` (`measure/business_operations_graph_baseline_snapshot.py` line 1015) calls `_resolve_package_globs({}, _read_jsonc(workspace_path))`, but `_resolve_package_globs` (line 821) expects a `{"pnpm-workspace.yaml": <parsed data>}` shape, so `manifest_paths.get("pnpm-workspace.yaml")` always returns `None` and falls through to the empty default.

This does not block task 2:

- The FR2 denominator still captures `pnpm-workspace.yaml` and every `package.json` (caught via `MANIFEST_FILE_NAMES` in `_is_scanner_input`, line 598), so the workspace configuration IS frozen.
- The R0 v1 projection's `discovery` schema (`candidateExtensions`, `configPaths`, `rule`, `sourcePathCount`, `sourcePathsSha256` only) excludes `packageGlobs`, so the R0 acceptance boundary is not affected.
- Archive replay, pre/post identity, and tamper detection all pass.

It is recorded here so that a subsequent R1 review or the v3 acceptance cycle can decide whether `packageGlobs` accuracy is in-scope. Per the R1 task 1 contract this is a documentation accuracy issue, not a contract defect; it does not justify a producer change inside this task 2 window. The task 2 green evidence stands.

## Gate disposition

- Phase R1 task 2 evidence captured. Green evidence: archive replay equals manifest, pre/post denominator, status, and staged-diff identity all hold, no drift, no abort, dirty worktree preserved.
- Phase R1 task 1 rereview PASS remains valid (46/46 producer+validator tests still green; no producer change).
- Phase R0 validator/contract acceptance remains valid (no validator change).
- Parent Phase 0 (`small_company_admin_privileges_20260722`): **REMAINS BLOCKED**.
- `small_company_admin_privileges_20260722` Phase S1: **REMAINS BLOCKED**.
- `customer_licensing_crm_20260722` contract/schema/Red: **REMAINS BLOCKED**.
- R1 task 3 (graph scan + binding) is NOT started in this receipt.
- No commit created. No unrelated APK work staged, reverted, overwritten, or cleaned.