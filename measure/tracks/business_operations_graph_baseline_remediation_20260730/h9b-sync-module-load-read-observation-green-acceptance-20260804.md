# H9b Sync Module-Load Read Observation Green Acceptance

## Scope

This receipt accepts only the sync/module-load read observation seam in the
in-container tracer machinery: the ESM `load` hook plus main-thread bootstrap
emission that make the generator entrypoint read and the `dist/assets/index.js`
static-import read observable as real `BASELINE_READ`/`DERIVED_BUILD_READ`
events, closing the live bijection failure of
`r1-v3-podman-execution-attempt-20260804-0004` (two declared-but-untraced
paths, zero extra anywhere). It does not change the parser, the four-member
bijection or its H9a detail payload, the declared-set derivation, the H6 cap
line, the phase-level publisher/validator, any pass/fail outcome, or any
pre-seal/candidate/hermetic/workspace carrier.

Acceptance authority is in-loop single-authority per `AGENTS.md` "Implement
high-risk work in-loop (… Measure acceptance …)". All gate runs below were
executed directly in this loop against the real runner and the real test
file. No Podman, pnpm, or real closure transaction was run.

## Accepted evidence

| Evidence | Value |
| --- | --- |
| Green runner SHA-256 | `dcf2831c32ea434dd153c3ba51abe18b357956c695d309647c6b98f861b1430f` |
| Frozen test SHA-256 | `ecd2738db9f65754a9eb35266df84b0d7c105da33a90fd956951ca77881a2ece` |
| Pre-Red runner SHA-256 (H9a Green, baseline) | `d697d2a345bb3edd44b6bdf0bc27a43ca0852c46ab5739386316d3f8636363b3` |
| Reconstructed pre-Green runner | `d697d2a345bb3edd44b6bdf0bc27a43ca0852c46ab5739386316d3f8636363b3` (byte-for-byte) |
| New H9b tests, Red run | 4 failed in `14.31s` (the pre-Green tracer emits only `fs.promises` events, e.g. `AssertionError: 1 != 3`) |
| New H9b tests, Green run | 4 passed in `16.25s` |
| Focused 30-test suite, Green run | 30 passed in `111.18s` (`-k "preseal or production_materialize or candidate_failure_evidence or trace_event_cap or trace_capture_failure_evidence or directory_enumeration or unknown_trace_event_kind or phase_level_failure or bijection_failure_detail or module_load"`) |
| Unchanged 26-test selection, pre-fix | 26 passed in `69.95s` (re-recorded with the post-Red test file; no H9b regression) |
| Runner delta vs reconstructed pre-Green | 7 hunks, `+113/-4` (three scripts extended, receipt extended, two config writers extended, one helper added) |
| Test delta vs pre-Red | Pure addition: two fixture helpers + four test methods (+723 lines) |

The frozen test SHA-256 equals the Post-Red hash recorded in
`h9b-sync-module-load-read-observation-pre-green-baseline-20260804.md`, so the
test surface is unchanged since the Red slice. The reconstructed pre-Green
runner equals the pre-Red runner SHA-256 pinned in that baseline byte-for-byte,
so the Green slice's pre-state is exact and its delta is attributable.

## Defect fixed

In the live attempt 0004, the `direct-runtime-trace` bijection failed with
exactly two declared-but-untraced paths and zero extra anywhere:

- `baselineReads` missing `packages/advantage-play-kit/scripts/generate-standard-pack-release.mjs` —
  the traced Node process entrypoint, read by Node's internal ESM loader via
  internal bindings, never through the public `node:fs/promises` wrapper.
- `derivedBuildReads` missing `packages/advantage-play-kit/dist/assets/index.js` —
  read by the generator's static ESM import
  `import { ... } from "../dist/assets/index.js"` (generator lines 6-10), the
  same internal-loader path.

### Investigation finding

The generator accesses `dist/assets/index.js` through a **static ESM import**
(not `readFileSync`, `require`, or `createRequire`). Node's ESM module map
loads it with internal `fs` bindings on the loader thread, so the existing
`direct-runtime-fs-promises-wrapper.mjs` interception of `node:fs/promises`
cannot observe it. The derived read set is exactly one path (pinned by
`_direct_runtime_prepared_dynamic_build_output_v1`'s frozen regex
`from\s+["'](\.\./dist/assets/index\.js)["']`); the barrel's ~30 re-export
siblings are not declared and must be silently ignored.

## Chosen interception mechanism

ESM `load` hook plus main-thread bootstrap emission, keeping the loader thread
as an observer only:

1. The trace config gains `moduleLoads` (entrypoint `BASELINE_READ` plus one
   `DERIVED_BUILD_READ` per receipt-bound derived read, derived from the sealed
   integration by the new `_direct_runtime_module_loads_v1` helper) and
   `moduleLoadObservationsPath` (an append-only file beside the raw artifact).
2. The `--import` bootstrap (`direct-runtime-tracer.mjs`) emits the module-load
   events at ordinals `0..k-1` before the entrypoint loads; the `fs.promises`
   wrapper resumes its ordinal counter at `k` by counting the existing prefix,
   so the total ordinal order stays one deterministic sequence with no
   gaps/duplicates. The entrypoint `BASELINE_READ` at ordinal 0 is the
   constraint-mandated pattern: the entrypoint module load is a deterministic
   consequence of process start and necessarily precedes every generator fs
   event.
3. The loader-thread `load` hook records one observation line per actual module
   load of a path that classifies into the declared baseline/derived sets and
   appears in `moduleLoads`; everything else (builtins, `/runner`, `node_modules`,
   resolution probes, the barrel siblings) is silently ignored.
4. The trace receipt requires observations == `moduleLoads` exactly and fails
   closed (nonzero exit, evidence preserved) when a declared module load was
   never observed; its output shape is unchanged.

### Justification (three sentences)

Bootstrap emission keeps every event's ordinal assigned on the main thread,
where the wrapper's counter already lives, so the total order is deterministic
and race-free even though the loads themselves happen on the loader thread. The
`load` hook is the only place Node exposes the entrypoint and `index.js` source
reads to interception, so it must observe them; making it a verifier rather
than an emitter avoids any cross-thread counter sharing while still failing
closed whenever a declared module load did not actually occur. Scoped emission
restricts sync/module-load events to paths that classify into the declared
sets, so strict `UNDECLARED` rejection remains exactly as before for the
existing `fs.promises` path only.

### Documented asymmetry (constraint 2)

Sync/module-load observation is scoped: only module loads whose resolved path
classifies into `baselineReadSet`/`derivedBuildReadSet` and is declared in
`moduleLoads` emit an event or an observation. Node-internal resolution probes
(package.json walks, stat checks, node_modules lookups) never reach a `load`
hook — they occur inside the default resolver — and non-declared module loads
(such as the barrel's 30 re-export siblings under `dist/assets/`) are silently
ignored, because Node's internal sync access patterns are runtime-defined and
nondeterministic. The strict `UNDECLARED` rejection therefore stays for the
`fs.promises` path ONLY; the asymmetry is deliberate and documented here.

## Green delta

The H9b runner delta is exactly 7 hunks (`+113/-4`):

1. `_direct_runtime_module_loads_v1` — new helper deriving the ordered
   `moduleLoads` declarations (entrypoint `BASELINE_READ` + every
   receipt-bound derived read) from the sealed integration.
2. `direct-runtime-tracer.mjs` (preload) — after `register(...)`, when
   `moduleLoads` is non-empty: validate each declaration against the declared
   sets, create the raw artifact (rejecting an existing one), append one event
   per declaration at ordinals `0..k-1` with the wrapper's exact event shape.
3. `direct-runtime-fs-promises-loader.mjs` — reads the trace config on the
   loader thread and adds a `load` hook that appends one
   `{kind, path}` observation per module load classifying into the declared
   sets and listed in `moduleLoads`; the existing `resolve` hook is unchanged.
4. `direct-runtime-fs-promises-wrapper.mjs` — additive optional validation of
   `moduleLoads`/`moduleLoadObservationsPath`; when the artifact exists it must
   hold exactly the module-load prefix and the ordinal counter resumes at that
   count; with no module loads the original reject-existing-artifact behavior
   is preserved.
5. `direct-runtime-trace-receipt.mjs` — when `moduleLoads` is non-empty, read
   the observations file, require exact set equality with `moduleLoads`, delete
   the observations file, and keep the output shape byte-identical.
6. `_runner_scripts` trace-config writer — adds `moduleLoads` +
   `moduleLoadObservationsPath`.
7. `_derive_trace_execution_context` trace-config writer — same two members.

The four-member bijection block, the H9a detail payload, the parser, the
declared-set derivation, the H6 cap line (`max_events = len(baseline) +
len(derived) + len(outputs) + directoryListingCount`), the read-set contract
validators, the phase-level publisher/validator, all carriers, and the happy
path are byte-unchanged.

### Cap consistency (constraint 5)

Verified: the cap line needs no change. It derives from declared-set counts,
and both new events are for paths already declared (`baselineReadSet` holds the
generator script, `derivedBuildReadSet` holds `index.js`), so the declared-set
components already budget them. The observations file is written by the loader
thread with raw `fs` and is never a traced write. The end-to-end test emits
exactly six events for a contract whose cap formula value is six.

### Duplicate discipline (constraint 4)

Kept: the parser still rejects a repeated `(kind, path)`, so a path read via
both module load and `fs.promises` would fail as a duplicate exactly as before.
Live evidence shows both missing files are read ONLY via module load today, so
exactly one new event each is expected and observed.

## Anchored reconstruction proof

- Reversing only the seven H9b runner edits reconstructs the complete
  pre-Green runner at `d697d2a345bb3edd44b6bdf0bc27a43ca0852c46ab5739386316d3f8636363b3`
  byte-for-byte (verified with `patch -R`; the reverse-edited bytes are
  identical to the pinned pre-Red runner).
- The Green runner diff against that reconstruction is exactly 7 hunks,
  `+113/-4`; the four deleted lines are the old wrapper guard block shape and
  the old artifact-exists/ordinal block, replaced by the module-load-aware
  variants.
- The frozen test SHA-256 (`ecd2738d…`) is byte-identical since the Red slice
  (pure addition of two fixture helpers and four test methods).

## Focused suite definition

All thirty names are in
`measure.tests.test_business_operations_graph_baseline_execution_closure.R1V3ExecutionClosureRedTests`.
The first twenty-six are the unchanged H1-H10 selection; the four new H9b
names are:

1. `test_tracer_module_load_entrypoint_read_emits_ordinal_zero_baseline_event`
2. `test_tracer_module_load_of_non_declared_path_emits_nothing`
3. `test_tracer_module_load_hook_verification_fails_closed_when_load_never_observed`
4. `test_trace_with_module_load_events_passes_end_to_end_bijection_against_real_contract`

No Podman or pnpm command was run; the suite exercises only the no-Podman
runner/test surfaces (local `node` subprocesses with the real runner scripts).

## Observed behavior

1. **Test 1** — the real tracer under local node emits exactly three events for
   a generator that imports the derived file and reads one baseline file: the
   entrypoint `BASELINE_READ` at ordinal 0 with the full baseline identity, the
   derived `DERIVED_BUILD_READ` at ordinal 1 with the receipt-bound identity,
   and the `fs.promises` source read at ordinal 2; all events carry the correct
   nonce/packet/rawEventArtifact/generatorPid/generatorScript provenance, the
   observations file records both module loads, and the real receipt verifies,
   deletes both files, and returns the same event list.
2. **Test 2** — a generator that additionally imports an undeclared
   `./private-helper.mjs` module produces no event for it, no `UNDECLARED`
   event, and no failure; the three declared events still emit and the receipt
   succeeds.
3. **Test 3** — with `moduleLoads` declaring the derived `index.js` while the
   generator never imports it, the bootstrap still emits the ordinal-0
   entrypoint event and the optimistic derived event, the load hook observes
   only the entrypoint, and the receipt fails closed with
   `module load observations mismatch` (nonzero exit) while retaining the raw
   artifact and observations as evidence.
4. **Test 4** — the real `_runner_scripts` writer emits
   `moduleLoads == [BASELINE_READ <generator>, DERIVED_BUILD_READ <index.js>]`
   and the container observations path; the real tracer produces the six-event
   stream (entrypoint, derived, two enumerations, source read, output write)
   that passes the real receipt, `parse_direct_command_runtime_trace_events_v1`
   and `validate_direct_command_runtime_execution_trace_v1` against a
   real-shaped sealed contract; the pre-H9b shape (both module-load events
   omitted) fails the bijection naming exactly those two paths — the exact live
   attempt-0004 divergence.

The twenty-six unchanged focused tests remain Green pre-fix and post-fix
(pre-fix receipt: 26 passed in 69.95s), and the full-file run shows no new
failures or errors beyond the documented pre-existing set (see below).

## Full-file verification

The entire 75-test module was run once against the Green runner: **65 passed,
9 failed, 1 skipped** in 830.53s (0:13:50). The identical full module was also
run once against the byte-reconstructed pre-Green runner
(`d697d2a3...`): **61 passed, 13 failed, 1 skipped** in 1006.95s (0:16:46).
The failure sets differ by exactly the four new H9b tests — they fail pre-fix
and pass post-fix — and the other nine failures are byte-identical in both
runs and disposed as pre-existing (the same nine as H7/H8/H9a/H10: F2
generator-blob hash drift, F4 noninstall-validator drift, the H2-era
`generate` source/state assertion drifts, and five V3-manifest tests that
require the absent frozen candidate directory `r1-v3-execution-closure-20260801/`).
The runner was restored to the Green SHA after the comparison run
(verified `dcf2831c…`).

### Supersession note for the opt-in H2 podman gate

The opt-in pinned-image gate
`test_direct_runtime_tracer_child_only_pinned_podman_acceptance`
(`RUN_R1_PODMAN_CHILD_TRACE_ACCEPTANCE=1`) predates H9b and asserts a raw
event stream of exactly one `fs.promises` event. Under the accepted H9b
contract the generator entrypoint module read is itself a traced
`BASELINE_READ` (the fixture's generator script IS declared in its
`baselineReadSet`), so that gate's event expectation is superseded and its
assertion must be updated before it is re-run. It is skipped in every gate run
above (not in the failure set), no Podman transaction is authorized in this
slice, and the gate's bytes are left untouched; this receipt documents the
supersession.

## Authorship

The Red test methods, the fixtures, the Green delta, the anchored
reconstruction, and every gate run were performed in-loop for this slice
against the real runner and the real test file.

## Decision and exclusions

**ACCEPT** -- bounded only to the sync/module-load read observation seam at
Green runner SHA-256
`dcf2831c32ea434dd153c3ba51abe18b357956c695d309647c6b98f861b1430f` and frozen
test SHA-256 `ecd2738db9f65754a9eb35266df84b0d7c105da33a90fd956951ca77881a2ece`.

Excluded: no candidate rerun or closure attempt; no parser, validator,
declared-set derivation, bijection, or H6 cap change; no phase-level publisher
or validator change; no pre-seal/candidate/hermetic/workspace carrier or
publisher change; no marker change (Phase R1 v3 remains `[~]`); no successor,
registry, V2/history, Finance, or Podman action. A confirming closure attempt
is still required before any candidate claim. The runner and test work remains
uncommitted shared R1-v3 work.
