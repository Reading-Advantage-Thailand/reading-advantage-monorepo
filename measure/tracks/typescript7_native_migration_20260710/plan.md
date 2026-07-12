# Plan: TypeScript 7 Native Compiler Migration

> This is a major toolchain migration. Keep TypeScript 6 available as the
> compatibility API and rollback path until diagnostic parity, full gates, controlled
> benchmarks, and the CI observation window are complete.

## Phase 1: Contract & Schema Definition

- [~] Task: Capture the compiler and repository baseline.
  - [ ] Record source SHA, `git status -sb`, Node/pnpm versions, CPU/memory, Turbo
    concurrency, and resolved TypeScript versions.
  - [ ] Save TypeScript 5.9 diagnostic and timing evidence for all workspaces.
  - [ ] Classify pre-existing failures separately from migration acceptance gates.
  - [ ] Refresh `graph.db` if it is older than 24 hours and save graph statistics.
- [~] Task: Inventory the complete TypeScript integration surface.
  - [ ] Enumerate all manifests, catalogs, aliases, `tsc` scripts, tsconfigs, compiler
    plugins, API imports, and TypeScript peer dependencies.
  - [ ] Map Next.js, Vinext/Vite, ESLint, Jest, Vitest, ts-node, tsx, tsup, Drizzle,
    commitlint, and config-loader compiler ownership.
  - [ ] Identify emit/declaration builds separately from `--noEmit` checks.
- [~] Task: Define the dual-compiler package contract.
  - [ ] Specify exact TypeScript 7.0.2 and TypeScript 6.0.2 aliases in the workspace
    catalog without ambiguous executable resolution.
  - [ ] Define native, compatibility, parity, and rollback commands.
  - [ ] Define which tools must remain on the TypeScript 6 programmatic API.
- [~] Task: Define diagnostic, benchmark, and rollout evidence schemas.
  - [ ] Specify normalized diagnostic records and reviewed-exception fields.
  - [ ] Specify benchmark records for elapsed time, RSS, diagnostics, CPU/checkers,
    cache state, and exit status.
  - [ ] Specify CI observation records and rollback triggers.
- [b] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Test

- [~] Task: Add package-resolution and executable contract tests.
  - [ ] Assert TypeScript 7 owns the native compiler command.
  - [ ] Assert TypeScript 6 remains importable by compiler-API consumers.
  - [ ] Assert frozen install and workspace catalog resolution are deterministic.
- [~] Task: Add tsconfig compatibility tests.
  - [ ] Reject removed options including `baseUrl`, legacy module resolution, and
    unsupported target/module combinations.
  - [ ] Require explicit narrow `types` lists for projects consuming ambient globals.
  - [ ] Cover emit/declaration configs separately from no-emit configs.
- [~] Task: Build a TypeScript 6/7 diagnostic parity harness.
  - [ ] Run each compiler against each tsconfig and capture normalized diagnostics.
  - [ ] Fail on missing, additional, or changed actionable diagnostics unless present
    in the reviewed parity ledger.
  - [ ] Prove the harness rejects a deliberately missing diagnostic.
- [~] Task: Build a controlled benchmark harness.
  - [ ] Require an idle-enough host or record the run invalid rather than publishing
    contaminated results.
  - [ ] Run at least three cold and warm samples and compute medians.
  - [ ] Fail benchmark acceptance when exit status or diagnostic counts differ.
- [~] Task: Add compiler-consumer smoke tests.
  - [ ] Cover ESLint/typescript-eslint, ts-node, tsx, tsup, Next.js, Vinext/Vite,
    Vitest, Jest, Drizzle tooling, and commitlint.
  - [ ] Verify Turbo cache invalidation includes compiler identity and relevant flags.
- [b] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Implement

- [~] Task: Install and pin the side-by-side compiler architecture.
  - [ ] Add the TypeScript 6 compatibility alias and TypeScript 7 native compiler
    alias through the workspace catalog.
  - [ ] Regenerate and review the lockfile without unrelated dependency upgrades.
  - [ ] Run frozen install and peer-dependency checks.
- [~] Task: Make all tsconfigs TypeScript 7-compatible.
  - [ ] Add minimal explicit Node/Jest/Vitest/Playwright/global type lists per project.
  - [ ] Remove marketing `baseUrl` and preserve path-alias resolution.
  - [ ] Remove or replace other TypeScript 7-incompatible options and constructs.
- [~] Task: Establish and reconcile TypeScript 6/7 diagnostic parity.
  - [ ] Run the parity harness across all 24 configs.
  - [ ] Fix migration-caused errors in their owning workspace.
  - [ ] Record and review every intentional diagnostic or semantic difference.
- [~] Task: Migrate check-types and eligible build commands.
  - [ ] Switch root and workspace `check-types` scripts to the native compiler.
  - [ ] Verify JavaScript and declaration emit before switching direct `tsc` builds.
  - [ ] Preserve explicit TypeScript 6 compatibility and rollback commands.
  - [ ] Bound TypeScript checker concurrency underneath Turbo parallelism.
- [~] Task: Run controlled performance benchmarks.
  - [ ] Benchmark packages/types, packages/domain, packages/db,
    apps/reading-advantage, and the uncached complete check-types graph.
  - [ ] Compare TypeScript 6 and 7 medians with equivalent semantics.
  - [ ] Tune checker concurrency once, rerun the complete benchmark matrix, and save
    the selected local and CI settings.
- [~] Task: Roll out TypeScript 7 through CI.
  - [ ] Add a temporary non-blocking parity lane.
  - [ ] Promote the TypeScript 7 lane only after parity and full gates pass.
  - [ ] Observe and record at least three representative CI runs.
- [b] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Generate Docs & Doctor

- [~] Task: Run the complete migration acceptance gates.
  - [ ] Run `pnpm turbo run lint`, `pnpm turbo run test`,
    `pnpm turbo run check-types`, and `pnpm turbo run build`.
  - [ ] Reconcile failures against the recorded baseline and reject migration-caused
    regressions.
  - [ ] Confirm performance thresholds and CI observation criteria are satisfied.
- [~] Task: Update durable TypeScript operator documentation.
  - [ ] Update `measure/tech-stack.md` with compiler and compatibility ownership.
  - [ ] Document aliases, scripts, editor setup, concurrency, benchmarks, fallback,
    and rollback.
  - [ ] Mark `typescript6_major_migration` superseded and record the TypeScript 7.1+
    compatibility-package removal follow-up.
- [~] Task: Refresh generated project facts and code graph.
  - [ ] Run `measure/generate.sh` using its documented invocation if present.
  - [ ] Update `graph.db` for changed manifests, scripts, and configurations.
  - [ ] Review generated diffs for unrelated churn.
- [~] Task: Run Measure doctor and final acceptance review.
  - [ ] Run `measure/doctor.sh` using its documented invocation if present.
  - [ ] Complete an automated change-quality review against this spec and plan.
  - [ ] Resolve all Critical and High findings before closeout.
- [b] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md) — deferred:product-owner
