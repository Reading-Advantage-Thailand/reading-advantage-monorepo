# R1 Task 1 High-Finding Remediation Receipt

- Track: `business_operations_graph_baseline_remediation_20260730`
- Phase/task: R1 Task 1 — deterministic dirty-worktree snapshot producer
- Review input: `r1-task1-review-20260730.json`
- Task state: **`[~]` pending independent rereview**
- Commit created: **no**
- Parent/successor gates changed: **no**
- R0 validator changed: **no**

## Remediation

| Finding | Repair and adversarial proof |
| --- | --- |
| `R1-T1-H1` | Rich archive replay now validates exact top-level/entry schemas and all manifest metadata. An untouched producer bundle verifies successfully before the retained tampering rejection test. |
| `R1-T1-H2` | The complete live denominator is independently rediscovered and byte/metadata hashed immediately before and after the scan seam. A tracked TypeScript file that is already dirty and changes while its Git status remains unchanged now aborts without publishing output. HEAD, branch, status, and staged diff are also compared. |
| `R1-T1-H3` | The rich v2 bundle now includes an accepted R0 v1 archive/manifest/state projection. The end-to-end test produces those artifacts, integrates them into a candidate, and obtains `ACCEPT` from the unchanged R0 `validate_candidate`. The test injects only the immutable frozen baseline HEAD because a temporary Git commit cannot reproduce that SHA; discovery, bytes, modes, tracked state, branch, worktree, artifacts, candidate lineage, and validator execution remain live. |
| `R1-T1-H4` | Every reachable in-repository `extends` target is parsed recursively, including workspace package-export targets. Staged and unstaged deletions are unioned and archived with baseline bytes/mode. Nested non-`tsconfig*.json` extends and staged deletion adversaries pass. |
| `R1-T1-H5` | Branch is read through `git symbolic-ref`; the scanner root must equal both `git rev-parse --show-toplevel` and the sole `git worktree list` root. File modes come from `lstat`, and deleted modes come from the baseline tree. Non-master, alternate scanner root, second worktree, and executable-file mode adversaries pass. |

## Verification

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_snapshot -v
Ran 17 tests in 6.272s
OK
```

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_remediation -v
Ran 29 tests in 8.227s
OK
```

The R1 Task 1 marker remains `[~]` until a separate reviewer closes every High
finding. Parent Phase 0, Admin Phase S1, and CRM contract/schema/Red remain
blocked.
