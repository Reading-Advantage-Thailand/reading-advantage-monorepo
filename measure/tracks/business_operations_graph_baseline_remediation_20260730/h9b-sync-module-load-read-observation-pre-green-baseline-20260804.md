# H9b Sync Module-Load Read Observation Pre-Green Baseline

This artifact freezes the only production seam authorized for the next Green
slice. It is a Red baseline, not acceptance evidence.

- Captured date: 2026-08-04
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Red runner SHA-256: d697d2a345bb3edd44b6bdf0bc27a43ca0852c46ab5739386316d3f8636363b3
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: 29637a0c48be79e3ea1ddd1327a6beb254111009df7fd8d8a5bf1ccacc1273f3
- Post-Red full test SHA-256: ecd2738db9f65754a9eb35266df84b0d7c105da33a90fd956951ca77881a2ece
- Authorized Green surface: the in-container tracer machinery only — the four
  embedded runner scripts (`direct-runtime-tracer.mjs`,
  `direct-runtime-fs-promises-loader.mjs`,
  `direct-runtime-fs-promises-wrapper.mjs`,
  `direct-runtime-trace-receipt.mjs`), the two trace-config writers
  (`_runner_scripts` and `_derive_trace_execution_context`), and one new
  module-loads derivation helper. Every other runner line remains
  byte-unchanged.
- Frozen: the four-member bijection comparison and its detail payload (H9a),
  the trace-event parser, the declared-set derivation, the H6 cap line
  (`max_events = len(baseline) + len(derived) + len(outputs) +
  directoryListingCount` at runner line 3035 — unchanged, see Cap Consistency
  below), the read-set contract validators, the phase-level failure publisher
  and validator (H8/H10 machinery), the happy path, and every previously
  accepted test.

## Defect this Red demonstrates

The live confirming attempt
`r1-v3-podman-execution-attempt-20260804-0004` failed at
`validate_direct_command_runtime_execution_trace_v1` with

    V3_DIRECT_RUNTIME_READ_SET_EXECUTION_TRACE_BIJECTION_FAILED: {"baselineReads":{"extra":[],"extraTotal":0,"missing":["packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs"],"missingTotal":1},"derivedBuildReads":{"extra":[],"extraTotal":0,"missing":["packages/advantage-play-kit/dist/assets/index.js"],"missingTotal":1},"divergenceSha256":"2db70dfa7afb7ff9a4dfa6300eb04ed7b47e79e410380ce413416d2b5b819c60"}

Exactly two declared paths were never traced, with zero extra anywhere:

| Bucket | Missing path | Why untraced |
|---|---|---|
| `baselineReads` | `packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs` | The traced Node process entrypoint — its bytes are read by Node's internal ESM loader, which uses internal bindings and never passes through the public `fs.promises` wrapper |
| `derivedBuildReads` | `packages/advantage-play-kit/dist/assets/index.js` | Read by the generator's static ESM import `import { ... } from "../dist/assets/index.js"` (generator script line 6-10) — also Node's internal module loader, not `fs.promises` |

### Investigation finding (how `dist/assets/index.js` is accessed)

The frozen generator `packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs`
accesses `dist/assets/index.js` through a **static ESM import**:
`import { createStandardAssetCatalog, ... } from "../dist/assets/index.js";`
(script lines 6-10). Node resolves and reads that module with its internal
ESM loader (module map, internal `fs` bindings), so the existing
`direct-runtime-fs-promises-wrapper.mjs` interception of the public
`node:fs/promises` surface cannot observe it. The entrypoint `.mjs` file is
read the same way when Node starts the generator. The derived read set is
exactly one path — `packages/advantage-play-kit/dist/assets/index.js` — pinned
by `_direct_runtime_prepared_dynamic_build_output_v1`'s frozen regex
`from\s+["'](\.\./dist/assets/index\.js)["']`, so the generator imports exactly
one derived file and its barrel re-exports (`standard-asset-contract.js`,
`standard-pack-release.js`, ...) are not declared and must be silently
ignored. Live evidence shows both missing files are read ONLY via these
untraced module-load paths today, so exactly one new event per path is
expected.

## Chosen interception mechanism

Extend the existing `--import` bootstrap and ESM loader with a **`load` hook
plus bootstrap emission**, keeping the loader thread as observer only:

1. The trace config gains two additive members: `moduleLoads` (the ordered
   `BASELINE_READ`/`DERIVED_BUILD_READ` module-load declarations derived from
   the sealed integration: the generator entrypoint plus every receipt-bound
   derived read) and `moduleLoadObservationsPath` (a second append-only file
   beside the raw artifact).
2. The main-thread bootstrap (`direct-runtime-tracer.mjs`, which runs before
   the entrypoint loads) emits the module-load events at ordinals `0..k-1`
   into the raw artifact; the `fs.promises` wrapper resumes its ordinal
   counter at `k` by counting the existing prefix. Total ordinal order stays a
   single deterministic sequence with no gaps or duplicates. The entrypoint
   event at ordinal 0 is the constraint-mandated pattern: module load of the
   entrypoint is a deterministic consequence of process start and necessarily
   precedes every generator fs event.
3. The loader-thread `load` hook only RECORDS observations of actual module
   loads (one JSON line per load into `moduleLoadObservationsPath`), for paths
   that classify into the declared baseline/derived sets and appear in
   `moduleLoads`. Node-internal resolution probes (package.json walks, stat
   checks, node_modules) never reach a `load` hook — they happen inside the
   default resolver — and non-declared module loads (e.g. the barrel's 30
   re-export siblings) are silently ignored: scoped emission only, strict
   `UNDECLARED` rejection remains for the existing `fs.promises` path ONLY.
   This asymmetry is documented in the acceptance doc.
4. The trace receipt, before finalizing, requires the observed module loads to
   equal `moduleLoads` exactly (by kind+path). A declared module load that was
   never observed fails closed with a nonzero exit, preserving the raw
   artifact and observations as evidence. The receipt output shape is
   unchanged.

## Red receipt

Command:

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k "module_load"

which selects exactly

- `R1V3ExecutionClosureRedTests.test_tracer_module_load_entrypoint_read_emits_ordinal_zero_baseline_event`
- `R1V3ExecutionClosureRedTests.test_tracer_module_load_of_non_declared_path_emits_nothing`
- `R1V3ExecutionClosureRedTests.test_tracer_module_load_hook_verification_fails_closed_when_load_never_observed`
- `R1V3ExecutionClosureRedTests.test_trace_with_module_load_events_passes_end_to_end_bijection_against_real_contract`

Observed result: all four failed in 14.31s against the pre-Green runner
(`d697d2a3...`): the traced generator emits only its `fs.promises` events
because the pre-Green tracer has no module-load machinery, so
`raw_events` holds one event instead of the declared entrypoint/derived
prefix (e.g. `AssertionError: 1 != 3`), the end-to-end bijection fails at the
same missing paths, and the fail-closed receipt gate has no observation
verification to trigger.

Focused-suite green baseline receipt (pre-fix, the shared no-Podman
26-test selection):

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -k "(preseal or production_materialize or candidate_failure_evidence or trace_event_cap or trace_capture_failure_evidence or directory_enumeration or unknown_trace_event_kind or phase_level_failure or bijection_failure_detail)" -q
    26 passed, 49 deselected in 69.95s (0:01:09)

## Authorized Green surface (bounded)

- `direct-runtime-tracer.mjs`: after `register(...)`, when `moduleLoads` is
  non-empty, validate each entry against the declared baseline/derived sets,
  create the raw artifact (rejecting an existing one), and append one event
  per module-load declaration at ordinals `0..k-1` with the same event shape
  the wrapper emits.
- `direct-runtime-fs-promises-loader.mjs`: read the trace config on the loader
  thread, add a `load` hook that records one observation line per module load
  of a path classifying into the declared sets AND listed in `moduleLoads`;
  everything else silently ignored.
- `direct-runtime-fs-promises-wrapper.mjs`: additive optional validation of
  `moduleLoads`/`moduleLoadObservationsPath`; when the artifact already exists
  it must contain exactly the module-load prefix (count), and the ordinal
  counter resumes at that count; when no module loads are declared the
  existing reject-existing-artifact behavior stays byte-identical.
- `direct-runtime-trace-receipt.mjs`: when `moduleLoads` is non-empty, read
  the observations file, require observations == moduleLoads exactly, delete
  the observations file, and keep the output shape unchanged.
- The two trace-config writers and one new `_direct_runtime_module_loads_v1`
  helper derive `moduleLoads` from the sealed integration and add
  `moduleLoadObservationsPath`.

The parser, the validator, the declared-set derivation, the four-member
bijection, the H6 cap line, the phase-level publisher/validator, all
pre-seal/candidate/hermetic/workspace carriers, and the happy path are frozen.

## Cap consistency (constraint 5)

The H6 cap line (`max_events = len(baseline) + len(derived) + len(outputs) +
directoryListingCount`) derives from DECLARED-SET counts. Both new events are
for paths already in `baselineReadSet` (the generator script) and
`derivedBuildReadSet` (index.js), so the declared-set-derived cap components
already account for them and the cap line needs no change. The module-load
observations file is written by the loader thread with raw `fs`, never
through the wrapper, so it is not a traced write. Verified by
`test_direct_runtime_trace_event_cap_covers_generator_ancillary_events` and by
the end-to-end test whose six events exactly equal the cap formula value.

## Duplicate discipline (constraint 4)

A path read both via sync/module load and via `fs.promises` produces two
events for the same `(kind, path)` and the parser rejects the duplicate
exactly as today. Live evidence shows both missing files are read ONLY via
module load, so exactly one new event each is expected.

## Authorship

The test methods, the fixtures, and the Red run were performed in-loop for
this slice against the real runner and the real test file.
