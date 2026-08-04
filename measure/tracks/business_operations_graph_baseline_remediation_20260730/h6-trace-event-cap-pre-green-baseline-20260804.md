# H6 Trace-Event Cap Generator-Ancillary Coverage Pre-Green Baseline

This artifact freezes the only production block authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-04
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Red runner SHA-256: cb06deb7dc40cfba73ed6a4957d878257eae5e7d1eb165bc0471b3d3b425fb69
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: 32b6b01fdaaf14a38e4b33b00c6c17a40d671454259ad7294733ae13680beb45
- Post-Red full test SHA-256: 0de7865de04d1b828ceb356b96a0449f3ac148db68a630c65f6ad77bccf34a66
- Authorized Green surface: only the `max_events` cap computation inside
  `build_direct_command_runtime_runner_integration_v1` (runner line 2970),
  widened to include the enumerated generator directory-enumeration events.
- Frozen: the cap remains deterministic and read-set-derived; the trace
  truncation/duplicates policies (`truncation: "REJECT"`,
  `duplicates: "REJECT"`), the in-container tracer ordinal guard
  (`if (ordinal >= config.maxEvents) throw`), the trace-event parser, the
  read-set shape/contract validators, the discovery walk, the runner
  scripts, the generator script itself, all other runner lines, and every
  test.

## Defect this Red demonstrates

Closing the D4 task from plan line 594. In
`build_direct_command_runtime_runner_integration_v1` the trace-event cap is

    max_events = len(baseline_read_set) + len(validated_read_set["derivedBuildReadSet"]) + len(validated_read_set["outputPaths"])

a count of distinct **declared file paths**, while the in-container tracer
(`direct-runtime-fs-promises-wrapper.mjs`, runner lines 5563-5621) records
**one event per `node:fs/promises` operation**. The generator's recursive
`discoverAssets()` issues one `readdir` per directory under
`assets/standard`; directory enumeration has no file path, so none of those
events is budgeted. Evidence: blocked attempts
`r1-v3-podman-execution-attempt-20260804-0002` and `-0003` both record
`tracePolicy.maxEvents: 43081` against ~1,900 `readdir` operations, and the
tracer aborts the transaction with `Error: raw trace event cap exceeded`
(see the D4 handoff `d4-apk-generator-read-profile-handoff-20260804.md` for
the full measured decomposition). Discovery already measures the missing
quantity: the read set carries `discovery.directoryListingCount: 1895`, and
the formula ignores the field.

Accepted contract: build one minimal `read_set`/`source_packet` integration
(mirroring the fixture style of the surrounding direct-runtime tests) and
require the computed `tracePolicy.maxEvents` to be at least
`len(baselineReadSet) + len(derivedBuildReadSet) + len(outputPaths)` plus the
enumerated generator directory-enumeration event count, expressed as the
named constant `H6_GENERATOR_ANCILLARY_DIRECTORY_ENUMERATION_EVENTS` rather
than a magic number.

## Generator fs operation enumeration (step 1)

Script: `packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs`.
The runner executes the baseline blob at commit
`e78fe22bb405de732de14c18590b19af0ce5f0de` (SHA-256
`ea4e072430cdc26d6072950651b3b18fbc4a62bde8bfbd91d8a3dda6a35edbb6`, 5,081
bytes). The live worktree file is byte-identical except for the default
version string on line 103 (`2026.07.23` vs `2026.08.04`, commit
`d6becf5f1eb948bfa7a3315fdb80ebf8de63c8b7`), so the fs-operation surface is
identical. Worktree SHA-256
`cda4ee633d13dd39dcf83a5880bc41a75224ec8e30b811d335d4295d43ce814d`.

Complete per-run `node:fs/promises` operation set:

| # | Operation | Script refs | Event count (real pack) | Budgeted today? |
| --- | --- | --- | --- | --- |
| 1 | `readFile(standardRoot/IMPORT-RECEIPT.tsv)` | line 80 | 1 | Yes, in `baselineReadSet` |
| 2 | `readFile(standardRoot/CURATED-RECEIPT.tsv)` | line 81 | 1 | Yes, in `baselineReadSet` |
| 3 | `readFile(standardRoot/LICENSE-RECEIPT.tsv)` | line 82 | 1 | Yes, in `baselineReadSet` |
| 4 | `readdir(directory, {withFileTypes: true})` per directory under `standardRoot` (recursive `discoverAssets`, incl. `standardRoot` itself) | lines 18-27 (`discoverAssets`), called at line 83 | 1,895 recorded by discovery / 1,911 per tree ancestor set | **No - the omitted ancillary set** |
| 5 | `readFile(standardRoot/<asset>)` per supported asset (`physicalMetadata`) | lines 47-61, called at line 101 | 43,075 (43,074 PNG + 1 OGG) | Yes, in `baselineReadSet` |
| 6 | `writeFile(standardRoot/standard-pack-release.json)` | line 118 | 1 | Yes, in `outputPaths` |

No doc reads: `ignoredExtensions = {".md", ".txt", ".tsv", ".json"}` (line
15) excludes SOURCES.md, README.md, LICENSE-ELVGAMES.txt and every other
`.md`/`.txt` leaf from the discovered `paths`, and the script never calls
`readFile` on them. The "may read docs during validation" hypothesis is
disproved by the script body - there is no validation pass that reads docs.
Docs participate only in the row-4 `readdir` enumeration of their containing
directories.

Ancillary (un-budgeted) event count = the directory-enumeration events, whose
exact count the read set already carries as
`discovery.directoryListingCount` (populated from
`len(discovery["directoryListings"])` in
`discover_direct_command_runtime_read_set_v1`, runner line 965). Named
constant in the test: `H6_GENERATOR_ANCILLARY_DIRECTORY_ENUMERATION_EVENTS =
1895` (the value recorded by both blocked attempts).

## Exact UTF-8 snapshot

The following code block is the exact UTF-8 byte sequence from pre-Green
runner lines 2970-2972, including one terminal LF. Its SHA-256 is
`b7c818bf7f63f42f59bcc3dab06d410dc941fdf4e4a6e05d0177c91b10424272` and it is
222 bytes.

```python
    max_events = len(baseline_read_set) + len(validated_read_set["derivedBuildReadSet"]) + len(validated_read_set["outputPaths"])
    if max_events <= 0:
        _direct_runtime_integration_fail("TRACE_EVENT_CAP_INVALID")
```

The only permitted Green change is to widen the first line's cap computation
to add the enumerated generator directory-enumeration events, derived
deterministically from the read set the runner already carries
(`validated_read_set["discovery"]["directoryListingCount"]`, the same unit
discovery measures), i.e. the assignment becomes the existing three terms
plus that field. The `if max_events <= 0:` guard and the
`TRACE_EVENT_CAP_INVALID` failure must remain byte-unchanged, and no other
behavior may change: no tracer, trace-policy, parser, validator, discovery,
runner-script, or generator edit.

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k test_direct_runtime_trace_event_cap_covers_generator_ancillary_events

which selects exactly
`R1V3ExecutionClosureRedTests.test_direct_runtime_trace_event_cap_covers_generator_ancillary_events`.

Observed result: one test failed in 2.20s only at

    AssertionError: 5 not greater than or equal to 1900 : V3_DIRECT_RUNTIME_TRACE_EVENT_CAP_OMITS_GENERATOR_DIRECTORY_ENUMERATIONS

The fixture integration built successfully with `tracePolicy.maxEvents = 5`
(3 baseline + 1 derived + 1 output) against the required 1,900 (5 budgeted +
1,895 directory enumerations), proving the current formula omits the
generator's ancillary directory-enumeration events. Before that assertion the
test proved one real integration build through the actual read-set shape
validator, source-packet digest binding, and resource-budget binding with no
Podman invocation and no V3 candidate directory.

## Authorship

The test method, the fixture, the enumeration, the frozen-block capture, and
the Red run were performed in-loop for this slice against the real runner and
the real generator script.
