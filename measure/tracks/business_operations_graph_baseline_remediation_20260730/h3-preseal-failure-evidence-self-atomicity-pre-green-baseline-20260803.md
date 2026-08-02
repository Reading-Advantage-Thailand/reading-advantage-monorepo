# H3 Pre-Seal Failure-Evidence Self-Atomicity Pre-Green Baseline

This artifact freezes the only production surface authorized for the next
Green slice. It is a baseline, not acceptance evidence.

- Captured date: `2026-08-03`
- Runner path: `measure/business_operations_graph_baseline_execution_closure_v3_podman.py`
- Runner SHA-256: `1fc29d748045d0f9192ed0c631da03b61eafb939c7bd7012389d7013ed91a98d`
- Test path: `measure/tests/test_business_operations_graph_baseline_execution_closure.py`
- Pre-Green full test SHA-256: `c5155f318fb735dba4d9bf07330570fc23bbb1bd237760e682a08c5848c72269`
- Authorized Green surface: only `_publish_failed_attempt` publication-ordering/cleanup tail below, plus one private pure helper if essential.
- Frozen: failed-attempt validator, `_finalize_command`, reservation helper, candidate publisher/helper and success path, `preserve_failure` routing/error semantics, all schemas/classifiers/carriers/stages, and existing tests.

## Exact UTF-8 snapshot

The following code block is the exact UTF-8 byte sequence from lines 6992-7018
of the pre-Green runner, including one terminal LF. Its SHA-256 is
`d6b21b7f5868d2d2af9fc7d13725732add6e0ce2fe90ea2922d60e1ad00721c3`.

```python
    directory = reserve_execution_attempt_directory_v1(attempts_root, run_day)
    finalized = _finalize_command(failed, directory, reference_root=TRACK_DIR / directory.name)
    sequence_match = re.fullmatch(rf"{re.escape(ATTEMPT_PREFIX)}-{run_day}-([0-9]{{4}})", directory.name)
    if sequence_match is None:
        _fail("V3_PODMAN_ATTEMPT_NAME_INVALID", directory.name)
    attempt = {
        "schemaVersion": 1,
        "kind": "execution-closure-failed-attempt",
        "status": "BLOCKED",
        "attempt": {"id": directory.name, "sequence": int(sequence_match.group(1)), "namingRule": ATTEMPT_NAMING_RULE},
        "historicalBlocker": _reference(HISTORICAL_PODMAN_BLOCKER),
        "failure": failure,
        "commands": [finalized],
        "markerDisposition": copy.deepcopy(core.MARKER_DISPOSITION),
        "upstreamAuthority": "NONE",
    }
    if forwarded_direct_runtime is not None:
        attempt["directRuntimeIntegration"] = forwarded_direct_runtime
    if forwarded_preseal_attempt is not None:
        attempt["directRuntimePreSealAttempt"] = forwarded_preseal_attempt
    if contract_for_attempt is not None:
        attempt["hermeticPnpmInstallContract"] = contract_for_attempt
    if workspace_contract_for_attempt is not None:
        attempt["workspacePrerequisiteBuildDag"] = workspace_contract_for_attempt
        attempt["workspaceBuildResolution"] = workspace_resolution_for_attempt
    _write_json(directory / "failed-attempt.json", attempt)
    validate_failed_execution_attempt_v1(attempt, directory)
```
