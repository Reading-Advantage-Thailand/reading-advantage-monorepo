# Implementation Plan: Cold-Start Performance

## Phase 1: Profiling & Root Cause (P0)

- [~] Task: Profile the cold-start path
  - [ ] Measure container startup time (image pull + Node.js boot + Next.js init)
  - [ ] Identify the dominant cost: image size, dependency loading, or initialization

  **Red-phase status (mid @ 2026-06-08).** Owned by implementer / supervisor (Green phase).
  - Red unit test committed: `apps/codecamp-advantage/lib/__tests__/_helpers/cold-start-sampler.test.ts` (file intentionally does not import a not-yet-written helper; vitest will fail on missing module).
  - Helper file `apps/codecamp-advantage/lib/__tests__/_helpers/cold-start-sampler.ts` is **NOT** written in this Red phase — that is the Green-phase deliverable for the implementer per the test-strategy §7 Red command (file does not exist yet → fail).
  - Live Red gate (persistent, owned by Phase 3 closeout): `PHASE1_PROD_URL=https://codecamp.reading-advantage.com pnpm --filter codecamp-advantage vitest run lib/__tests__/prod-smoke/phase-1-infrastructure.test.ts -t "cold start time"` is already Red on prod by design (gated by `PHASE1_SKIP=1` in CI). Do not add `it.skip` to it.
  - Baseline artifact `measure/tracks/codecamp_infra_cold_start_20260608/baseline/cold-start-baseline.json` is the Green-phase deliverable that requires (a) the helper to exist, (b) a forced scale-to-zero, then (c) N=5 sampling against prod. Owner: implementer (post-Green) or supervisor (manual run). See test-strategy §3 for the scale-to-zero precondition.
  - Red command log (this turn):
    - Command: `pnpm --filter codecamp-advantage exec vitest run lib/__tests__/_helpers/cold-start-sampler.test.ts`
    - Exit code: 1 (`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`).
    - Vitest summary: `Test Files 1 failed (1)`, `Tests no tests` (the 8 new test cases were not collected because the suite failed to import).
    - Failure cause: `Error: Failed to resolve import "../_helpers/cold-start-sampler" from "lib/__tests__/_helpers/cold-start-sampler.test.ts". Does the file exist?` (Vite import-analysis plugin).
    - Interpretation: this is the **expected** Red — the helper file is intentionally absent (Green-phase deliverable). The 8 new unit-test cases will start collecting and running once `apps/codecamp-advantage/lib/__tests__/_helpers/cold-start-sampler.ts` is written.
    - Live prod probe (persistent Red gate, **not re-run this turn** to avoid an outbound prod call from the sandbox): `PHASE1_PROD_URL=https://codecamp.reading-advantage.com pnpm --filter codecamp-advantage vitest run lib/__tests__/prod-smoke/phase-1-infrastructure.test.ts -t "cold start time"` is documented as already-Red in the test-strategy §7; owned by Phase 3 closeout; do not add `it.skip` to it.

## Phase 2: Optimization (P0)

- [ ] Task: Reduce cold-start time
  - [ ] Evaluate Cloud Run `min-instances` configuration to keep at least 1 instance warm
  - [ ] Evaluate image-size reduction (multi-stage Docker build, tree-shaking)
  - [ ] Evaluate Next.js startup hooks or lazy initialization

## Phase 3: Verification (P0)

- [ ] Task: Re-run Phase 1/6 cold-start probes
  - [ ] Cold-start < 5s passes on prod
  - [ ] No warm-request latency regression
