# H3 Pre-Seal Materialize Rename-Failure Pre-Green Baseline

This artifact freezes the only production block authorized for the next
Green slice. It is a Red baseline, not acceptance evidence.

- Captured date: `2026-08-03`
- Runner path: `measure/business_operations_graph_baseline_execution_closure_v3_podman.py`
- Pre-Green runner SHA-256: `9c70fcd2da2bd73a846bfb0fd9aca6fb7da4264f6e125e6632b96e78f5a3f6dc`
- Test path: `measure/tests/test_business_operations_graph_baseline_execution_closure.py`
- Pre-Red full test SHA-256: `e74124c9c64074af78d8d7b627b78f5b5bdf81637e7a8d06c80d7199c20b6a9c`
- Post-Red full test SHA-256: `899d21a89a1dd5707db8f5a080277bbd1dc7bee5a91d3862bdc379967e63e089`
- Authorized Green surface: only the captured rename exception/cleanup block below.
- Frozen: `_next_failed_execution_attempt_identity_v1`, private staging and raw-reference construction, validator, finalizer, reserve helper, outer staging cleanup, `preserve_failure` routing and message, schemas/carriers/classifications/stages/tests, and all candidate paths.

## Context anchors

The snapshot is within `_publish_failed_attempt` after the private
`directory = staging_parent / attempt_name` finalization and validation path.
It begins at private `failed-attempt.json` write and validation, then covers
the public reservation, exactly one `os.rename`, reservation cleanup, and
outer private staging cleanup. The preceding identity/staging anchors are
`attempt_name, sequence = _next_failed_execution_attempt_identity_v1(root, run_day)`
and `staging_parent = Path(tempfile.mkdtemp(prefix=".failed-attempt-", dir=root))`.

## Exact UTF-8 snapshot

The following code block is the exact UTF-8 byte sequence from pre-Green
runner lines 7069-7089, including one terminal LF. Its SHA-256 is
`128f187a8ba8d86f0c8d414519a09ee3dfa89bfead41a8e35ee3381cfdcbf17f`.

```python
        _write_json(directory / "failed-attempt.json", attempt)
        validate_failed_execution_attempt_v1(attempt, directory)
        try:
            final_directory.mkdir()
        except FileExistsError:
            _fail("V3_PODMAN_ATTEMPT_PUBLICATION_COLLISION", attempt_name)
        final_reserved = True
        try:
            os.rename(directory, final_directory)
            published = True
        finally:
            if final_reserved and not published:
                try:
                    shutil.rmtree(final_directory)
                except FileNotFoundError:
                    pass
    finally:
        try:
            shutil.rmtree(staging_parent)
        except FileNotFoundError:
            pass
```

## Red receipt

Command:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests.test_preseal_materialize_failure_evidence_rename_failure_cleans_reservation_and_retains_cause
```

Observed result: one test failed in `0.166s` only at
`self.assertIs(rename_error.__cause__, materialize_error)`: the pre-created
`OSError('V3_TEST_PRESEAL_FAILURE_EVIDENCE_RENAME')` has no explicit cause.
All prior assertions proved one real private validation, one canonical
private-to-public rename call, empty publisher-owned reservation, and cleanup
of final reservation and private stage.
