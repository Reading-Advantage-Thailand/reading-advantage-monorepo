# Red Run Receipt — R1 Task 1: Snapshot Producer (Baseline)

- Track: `business_operations_graph_baseline_remediation_20260730`
- Phase: R1, Task 1
- Branch/worktree contract: one shared `master` worktree
- Baseline HEAD: `3ff9b734a9e5a69f777108827b569e4f20a5ceb8`
- Production code modified: **no** (the producer is absent for this Red receipt)
- Test file added: `measure/tests/test_business_operations_graph_baseline_snapshot.py`
- Commit created: **no**
- Expected state: **Red solely at the absent R1 producer boundary**

## Focused Red command

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_snapshot -v
```

## Focused Red result

```text
Ran 9 tests in 1.128s
FAILED (errors=8)
```

All 8 failures are the intentional boundary failure:

```text
ModuleNotFoundError: No module named 'measure.business_operations_graph_baseline_snapshot'
```

## Coverage of the R1 task contract

| R1 acceptance bullet | Covering Red test |
| --- | --- |
| Complete scanner-input denominator (TS candidates, tsconfig extends chain, manifests, workspace/lock, build-graph.config.json) | `test_complete_discovery_includes_ts_configs_extends_manifests_and_graph_config` |
| Tracked modifications and untracked inputs without changing the real Git index | `test_tracked_modification_and_untracked_input_are_hashed_without_index_mutation` |
| Deletions of tracked inputs preserved as scanner-input events | `test_deletion_is_preserved_as_a_tracked_scanner_input_event` |
| Symlinks archived with target metadata and bytes | `test_symlink_is_archived_with_target_metadata_and_bytes` |
| Duplicate, absolute, traversal, and alias archive paths | `test_duplicate_and_traversal_archive_paths_are_rejected` |
| Archive tampering detected by replay verification | `test_archive_tampering_is_rejected_by_replay_verification` |
| Pre/post concurrent drift aborts before publishing artifacts | `test_concurrent_drift_aborts_before_publishing_artifacts` |
| Deterministic repeatability and R0 `sourceSnapshot` projection shape | `test_output_is_deterministic_and_source_snapshot_matches_r0_shape` |
| Integration with the accepted R0 validator (no weakening) | `test_accepted_r0_validator_remains_green` |

The Red receipt is consistent with the accepted R0 validator and does not
mutate, clean, or unblock the parent or successor tracks.
