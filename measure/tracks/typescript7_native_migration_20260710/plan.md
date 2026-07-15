# Plan: TypeScript 7 Native Compiler Migration

> This is a major toolchain migration. Keep TypeScript 6 available as the
> compatibility API and rollback path until diagnostic parity, full gates, controlled
> benchmarks, and the CI observation window are complete.

## Phase 1: Contract & Schema Definition

- [x] Task: Capture the compiler and repository baseline. [commits: f68897ac, 32346d6a, 47683590, 8f11c9b3; accepted in phase-1-acceptance-result.json]
  - [x] Record source SHA, `git status -sb`, Node/pnpm versions, CPU/memory, Turbo
    concurrency, and resolved TypeScript versions.
  - [x] Save TypeScript 5.9 diagnostic and timing evidence for all workspaces.
  - [x] Classify pre-existing failures separately from migration acceptance gates.
  - [x] Refresh `graph.db` if it is older than 24 hours and save graph statistics.
- [x] Task: Inventory the complete TypeScript integration surface. [commits: f68897ac, f153654b, 8ed5ff73]
  - [x] Enumerate all manifests, catalogs, aliases, `tsc` scripts, tsconfigs, compiler
    plugins, API imports, and TypeScript peer dependencies.
  - [x] Map Next.js, Vinext/Vite, ESLint, Jest, Vitest, ts-node, tsx, tsup, Drizzle,
    commitlint, and config-loader compiler ownership.
  - [x] Identify emit/declaration builds separately from `--noEmit` checks.
- [x] Task: Define the dual-compiler package contract. [commits: f68897ac, 2bd70b09]
  - [x] Specify exact TypeScript 7.0.2 and TypeScript 6.0.2 aliases in the workspace
    catalog without ambiguous executable resolution.
  - [x] Define native, compatibility, parity, and rollback commands.
  - [x] Define which tools must remain on the TypeScript 6 programmatic API.
- [x] Task: Define diagnostic, benchmark, and rollout evidence schemas. [commits: f68897ac, eff14a23]
  - [x] Specify normalized diagnostic records and reviewed-exception fields.
  - [x] Specify benchmark records for elapsed time, RSS, diagnostics, CPU/checkers,
    cache state, and exit status.
  - [x] Specify CI observation records and rollback triggers.
- [b] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md) (deferred:product-owner)

## Phase 2: Test

- [x] Task: Add package-resolution and executable contract tests. [accepted in phase-2-acceptance-result.json]
  - [x] Assert TypeScript 7 owns the native compiler command.
  - [x] Assert TypeScript 6 remains importable by compiler-API consumers.
  - [x] Assert frozen install and workspace catalog resolution are deterministic.
- [x] Task: Add tsconfig compatibility tests. [accepted in phase-2-acceptance-result.json]
  - [x] Reject removed options including `baseUrl`, legacy module resolution, and
    unsupported target/module combinations.
  - [x] Require explicit narrow `types` lists for projects consuming ambient globals.
  - [x] Cover emit/declaration configs separately from no-emit configs.
- [x] Task: Build a TypeScript 6/7 diagnostic parity harness. [accepted in phase-2-acceptance-result.json]
  - [x] Run each compiler against each tsconfig and capture normalized diagnostics.
  - [x] Fail on missing, additional, or changed actionable diagnostics unless present
    in the reviewed parity ledger.
  - [x] Prove the harness rejects a deliberately missing diagnostic.
- [x] Task: Build a controlled benchmark harness. [accepted in phase-2-acceptance-result.json]
  - [x] Require an idle-enough host or record the run invalid rather than publishing
    contaminated results.
  - [x] Run at least three cold and warm samples and compute medians.
  - [x] Fail benchmark acceptance when exit status or diagnostic counts differ.
- [x] Task: Add compiler-consumer smoke tests. [accepted in phase-2-acceptance-result.json]
  - [x] Cover ESLint/typescript-eslint, ts-node, tsx, tsup, Next.js, Vinext/Vite,
    Vitest, Jest, Drizzle tooling, and commitlint.
  - [x] Verify Turbo cache invalidation includes compiler identity and relevant flags.
- [b] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Implement

- [x] Task: Install and pin the side-by-side compiler architecture. [accepted in phase-3a-acceptance-result.json]
  - [x] Add the TypeScript 6 compatibility alias and TypeScript 7 native compiler
    alias through the workspace catalog.
  - [x] Regenerate and review the lockfile without unrelated dependency upgrades.
  - [x] Run frozen install and peer-dependency checks. [accepted in phase-3a-acceptance-result.json]
- [x] Task: Make all tsconfigs TypeScript 7-compatible. [accepted in phase-3b-structural-result.json and phase-3c-acceptance-result.json]
  - [x] Add only compiler-proven Node/Jest/Vitest/Playwright/global type lists per project.
  - [x] Remove marketing `baseUrl` and preserve path-alias resolution.
  - [x] Remove or replace other TypeScript 7-incompatible options and constructs.
- [x] Task: Establish and reconcile TypeScript 6/7 diagnostic parity. [accepted in phase-3c-acceptance-result.json]
  - [x] Run the provenance-bound parity harness across all 39 configs.
  - [x] Fix migration-caused errors in their owning workspace.
  - [x] Record and review every intentional diagnostic or semantic difference.
- [~] Task: Migrate check-types and eligible build commands.
  - [~] Switch root and workspace `check-types` scripts to the native compiler.
    - [x] Remove ambiguous hoisted `tsc` routing from workspace scripts; pin pre-3e emit commands to TypeScript 6. [evidence: phase-3d-types-cutover-result.json]
    - [x] Cut over `@reading-advantage/types` with explicit TypeScript 6 compatibility and rollback scripts. [evidence: phase-3d-types-cutover-result.json]
    - [x] Cut over `@reading-advantage/db` with explicit TypeScript 6 compatibility and rollback scripts. [evidence: phase-3d-db-cutover-result.json]
    - [x] Cut over `@reading-advantage/domain`; preserve and classify its parity-proven pre-existing diagnostics. [evidence: phase-3d-domain-cutover-result.json]
    - [x] Cut over `@reading-advantage/auth`; preserve and classify its parity-proven pre-existing diagnostics. [evidence: phase-3d-auth-cutover-result.json]
    - [x] Cut over shared UI, utility, and GitHub-integration checks; preserve and classify UI's parity-proven pre-existing diagnostics. [evidence: phase-3d-shared-cutover-result.json]
    - [ ] Continue the required workspace order from `apps/advantage-games` through the remaining applications.
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
