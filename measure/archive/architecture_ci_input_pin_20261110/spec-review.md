# Spec Review — architecture_ci_input_pin_20261110

Author model: deepseek/deepseek-flash#high

## What this track proposes

This track adds a CI mode to the architecture boundary check. CI passes the new flag
`--skip-input-snapshot-pin`, which skips only the `analyzerInputSnapshotSha256` comparison;
every other manifest check stays active. A new analyzed file still fails CI because the
analyzer report binds the exact source path list. The track also adds a local refresh
command, `pnpm architecture:pin:refresh`, which rewrites the five pinned manifest fields
only with `--acknowledge`. The archived track backend_architecture_enforcement_20260713
stays intact.

## How the current system works, per this spec

CI runs `pnpm architecture:check` at `.github/workflows/ci.yml:156-157` in the
"Build, Lint, and Test" job. The command validates the committed v2 reconciliation
manifest and compares five pinned fields against current bytes, including
`analyzerInputSnapshotSha256`. That pin last changed in commit 221081178 on 2026-09-08,
so every later change to an analyzed file fails CI. The evidence projection reads clean
HEAD bytes for all paths outside `packages/architecture-enforcement`, so only committed
state moves the pins.

## Findings

- None blocking.
- F1 [Nit] spec.md §2 Evidence (pin computation): the parenthetical range `:775-805` names
  `listAnalyzerInputPaths`, the path-listing helper; the hash functions are `:812` (async)
  and `:837` (sync), already cited in the same bullet. Rationale: record accuracy; the range
  should point at the compute functions or say "path list".
- F2 [Nit] plan.md task 1.2: the plan says to parse `--skip-input-snapshot-pin` and carry it
  in `ArchitectureCheckCliOptions`, but never says to pass `options.skipInputSnapshotPin`
  into `checkArchitectureRepository` inside `runArchitectureCheckCli`
  (architecture-check-cli.ts:114-119), and no AC asserts the flag reaches the checker.
  Rationale: a parsed-but-inert flag would pass AC-1 and AC-4 while CI still fails; add one
  wiring sentence and one parse-or-flow assertion.
- F3 [Nit] plan.md task 1.1 / spec.md §6 AC-2: the fixture must satisfy
  `hasFullRepositoryInputSet` (v2-manifest-validation.ts:916-923), else the whole
  current-state block is skipped and AC-2 fails for the wrong reason. Rationale: name the
  existing fixture pattern `createMinimalV2EvidenceRepository` (baseline-validation.test.ts:112)
  so the Red test exercises the real comparison block.
- F4 [Nit] metadata.json description: it says the track proves "a new analyzed file with a
  boundary finding still fails", while spec D-2 and AC-2 prove a new analyzed file with no
  finding fails through the report hash binding. Rationale: the metadata narrows the claim
  and disagrees with the spec; align the wording.

Verdict: pass. No blocking findings. Retry recommendation: none.

Dispositions: F1 FIX, F2 FIX, F3 FIX, F4 FIX.
