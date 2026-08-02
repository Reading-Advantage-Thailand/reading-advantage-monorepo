# H3 Pre-Seal Materialize Collision Pre-Green Baseline

This artifact freezes the only production block authorized for the next
Green slice. It is a Red baseline, not acceptance evidence.

- Captured date: `2026-08-03`
- Runner path: `measure/business_operations_graph_baseline_execution_closure_v3_podman.py`
- Pre-Green runner SHA-256: `cecfe1fe4713454c1b856024d2ae9f79a9c4faca879086f9d97b6976ecd7c471`
- Test path: `measure/tests/test_business_operations_graph_baseline_execution_closure.py`
- Pre-Red full test SHA-256: `899d21a89a1dd5707db8f5a080277bbd1dc7bee5a91d3862bdc379967e63e089`
- Post-Red full test SHA-256: `8f403418cfb729b0228928cd51315ed3b94dcd45efb608bf063eab097b5f881a`
- Authorized Green surface: only the captured `FileExistsError` block below.
- Frozen: private identity/staging/raw references, validator, finalizer, reserve helper, rename exception/cleanup, outer staging cleanup, `preserve_failure` routing/message, schemas/carriers/classifications/stages/tests, and all candidate paths.

## Context anchors

The snapshot is in `_publish_failed_attempt` immediately after private
`failed-attempt.json` write and real validator acceptance, and immediately
before unchanged `final_reserved = True`, rename exception causality, and both
cleanup boundaries. The preceding anchors remain
`final_directory = root / attempt_name` and the private canonical leaf under
`staging_parent = Path(tempfile.mkdtemp(prefix=".failed-attempt-", dir=root))`.
The only permitted Green change is to make the collision validation error
retain the existing `error` as its explicit cause; no reservation cleanup or
competing directory ownership behavior may change.

## Exact UTF-8 snapshot

The following code block is the exact UTF-8 byte sequence from pre-Green
runner lines 7071-7074, including one terminal LF. Its SHA-256 is
`3d05a8465e98620956829c709a92dc703f99b28ca4854d1330d4887b23820383`.

```python
        try:
            final_directory.mkdir()
        except FileExistsError:
            _fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)
```

## Red receipt

Command:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests.test_preseal_materialize_failure_evidence_collision_preserves_existing_attempt_and_retains_cause
```

Observed result: one test failed in `0.161s` only at
`self.assertIs(collision_error.__cause__, materialize_error)`: the real
`ExecutionClosureValidationError` for
`V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION: r1-v3-podman-execution-attempt-20260802-0001`
has no explicit cause. Before that assertion, the test proved one real private
validation, no public path during validation, a single intercepted expected
public `Path.mkdir`, a byte-identical pre-existing sentinel with no publisher
JSON/raw child, private-stage cleanup, and no rename/candidate/generic/Podman
or later-stage action.
