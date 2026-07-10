# Specification: TypeScript 7 Native Compiler Migration

## Overview

Adopt stable TypeScript 7 as the monorepo's command-line compiler and type-checker
without breaking tools that still consume the legacy TypeScript programmatic API.
Use the official side-by-side architecture: TypeScript 7 owns eligible `tsc`
invocations, while `@typescript/typescript6` remains available through the
`typescript` package name for `typescript-eslint`, `ts-node`, configuration loaders,
and other compiler-API consumers until TypeScript 7.1 or later provides a supported
replacement API.

This track supersedes the deferred `typescript6_major_migration` backlog stub.
TypeScript 6 is a compatibility bridge in this track, not the final compiler target.

## Baseline and Evidence

The 2026-07-10 feasibility audit established the following live baseline:

- Stable registry releases are `typescript@7.0.2` and
  `@typescript/typescript6@6.0.2`.
- The workspace currently resolves TypeScript 5.9.3.
- 25 manifests declare TypeScript, 24 `tsconfig*.json` files exist, and 21
  workspaces invoke `tsc` in build or `check-types` scripts.
- The shared config already uses `strict`, `target: ES2022`, `module: ESNext`, and
  `moduleResolution: bundler`.
- `apps/marketing/tsconfig.json` is the sole config using removed `baseUrl`.
- A TypeScript 7 probe against `packages/types` failed because TypeScript 7 defaults
  `types` to `[]`; Node globals and `node:*` modules therefore require explicit
  `types` configuration.
- Repository source does not directly import the TypeScript compiler API, but
  resolved tooling peers such as `typescript-eslint`, `ts-node`, `tsup`, and
  `tsconfck` currently bind to TypeScript 5.9.3.
- The fresh code graph contains 23,009 nodes across 2,777 files. The largest TypeScript
  surfaces are `reading-advantage` (957 files), `science-advantage` (400),
  `primary-advantage` (388), and `advantage-games` (274).
- Local performance measurements were intentionally rejected because unrelated
  package installs and tests saturated the machine during the audit. This track must
  capture controlled before/after timings rather than reuse contaminated numbers.

## Functional Requirements

### FR-1: Capture a Reproducible Compiler Baseline

- Record the source commit, worktree state, Node and pnpm versions, CPU count, memory,
  TypeScript 5.9 version, and relevant Turbo concurrency settings.
- Inventory every direct TypeScript declaration, `tsc` script, `tsconfig` inheritance
  chain, compiler plugin, and package that imports or peers on `typescript`.
- Capture clean TypeScript 5.9 diagnostic output and timing for each workspace before
  changing compiler resolution.
- Separate pre-existing failures from migration-caused regressions; do not convert an
  existing red gate into a claimed TypeScript 7 failure.
- Refresh `graph.db` before implementation if it is older than 24 hours.

### FR-2: Define and Test the Dual-Compiler Contract

- Add contract tests for the intended package resolution and executable mapping.
- Keep the legacy programmatic API available through
  `typescript: npm:@typescript/typescript6@6.0.2` or an equivalent reviewed pnpm
  alias compatible with workspace catalogs.
- Install stable TypeScript 7.0.2 under a separate package alias that exposes the
  TypeScript 7 `tsc` binary without displacing the compatibility API required by
  tooling.
- Provide explicit, discoverable scripts for TypeScript 6 compatibility checks and
  TypeScript 7 native checks during the parity period.
- Prove `typescript-eslint`, ESLint config loading, `ts-node`, `tsx`, `tsup`, Next.js,
  Vinext/Vite, Vitest, Jest, Drizzle tooling, and commitlint continue to load and run.
- Reject an install layout that produces ambiguous or environment-dependent `tsc`
  resolution.

### FR-3: Make Every TypeScript Configuration 7-Compatible

- Run TypeScript 7 against all 24 TypeScript configurations.
- Add the narrowest explicit `types` list required by each project, including Node,
  Jest, Vitest, Playwright, or other globals only where consumed.
- Do not restore the old implicit behavior with a monorepo-wide `types: ["*"]` unless
  documented evidence proves narrow lists are impractical.
- Remove `baseUrl` from `apps/marketing/tsconfig.json` and make its `paths` entries
  project-relative without changing import behavior.
- Reject removed TypeScript 7 options and constructs, including legacy module
  resolution, unsupported module/target combinations, false interop settings, and
  suppressed deprecations.
- Verify build configs that emit JavaScript or declarations separately from
  `--noEmit` configs.

### FR-4: Establish Diagnostic Parity

- Run TypeScript 6 with `stableTypeOrdering` enabled and no `ignoreDeprecations` flag
  as the semantic compatibility oracle recommended by the TypeScript team.
- Normalize compiler output so ordering, absolute paths, and timing noise do not
  create false differences.
- Require TypeScript 6 and TypeScript 7 to report the same actionable diagnostics for
  every workspace, except for reviewed intentional TypeScript 7 changes documented in
  a parity ledger.
- Fix migration-caused errors in the owning app or package without adding blanket
  `@ts-ignore`, `@ts-nocheck`, `skipLibCheck` expansions, or Next.js
  `ignoreBuildErrors` escape hatches.
- Add focused regression tests for any intentional type-behavior change that affects
  a public contract or runtime-emitted output.

### FR-5: Migrate Type-Check and Eligible Build Commands

- Route root and workspace `check-types` commands to TypeScript 7 after parity is
  proven.
- Route direct `tsc` package builds to TypeScript 7 only after JavaScript and
  declaration emit is byte-equivalent or the reviewed differences are harmless.
- Keep tools that embed TypeScript on the TypeScript 6 compatibility API.
- Preserve Turbo task boundaries and caching correctness; compiler identity and
  relevant flags must participate in cache invalidation.
- Avoid multiplying TypeScript 7 worker counts underneath Turbo parallelism. Select
  and document bounded `--checkers` and, if project references are adopted,
  `--builders` settings for local and CI hardware.
- Retain a one-command TypeScript 6 fallback throughout rollout.

### FR-6: Measure Performance and Resource Use

- Benchmark at least `packages/types`, `packages/domain`, `packages/db`,
  `apps/reading-advantage`, and the complete Turbo `check-types` graph.
- Run cold and warm measurements at least three times per compiler on an otherwise
  idle machine and report medians.
- Capture elapsed time, peak RSS, exit status, diagnostic count, CPU count, checker
  count, and Turbo cache state.
- Compare TypeScript 6 and TypeScript 7 under equivalent semantic settings; TypeScript
  5.9 may be retained as an informational baseline only.
- Treat a faster run with missing diagnostics as a failed benchmark.
- Define an acceptance threshold of at least 3x median speedup for the largest
  standalone app or 2x for the uncached monorepo graph, unless a documented bottleneck
  shows TypeScript is no longer the dominant cost.

### FR-7: Validate the Full Toolchain and CI Rollout

- Run frozen install and peer-dependency validation after the alias/catalog changes.
- Run affected ESLint, test, type-check, build, and configuration-loading commands for
  all apps and packages.
- Run the complete `pnpm turbo run lint`, `test`, `check-types`, and `build` gates,
  recording baseline debt separately.
- Add a temporary CI parity lane before making TypeScript 7 the required gate.
- Observe at least three representative CI runs after cutover for stability, cache
  correctness, memory pressure, and order-dependent diagnostics.
- Pin checker concurrency in CI if runner topology or diagnostic determinism requires
  it.

### FR-8: Document Ownership, Rollback, and Follow-Up

- Update `measure/tech-stack.md` with TypeScript 7 as the compiler and TypeScript 6 as
  the temporary compatibility API.
- Document the package alias strategy, command mapping, local editor setup, CI
  concurrency, benchmark results, and fallback command.
- Define rollback as switching required checks back to TypeScript 6 without reverting
  unrelated configuration correctness fixes.
- Create a follow-up item for removing the TypeScript 6 compatibility package after
  TypeScript 7.1+ and all compiler-API consumers support the new API.
- Archive or mark `typescript6_major_migration` superseded when this track begins.

## Non-Functional Requirements

- The migration must be reversible until the CI observation window completes.
- Compiler versions and aliases must be exact or centrally pinned; no floating major
  ranges are permitted.
- Type safety must not be weakened to obtain parity.
- Install, benchmark, and diagnostic evidence must be saved under this track in a
  machine-readable format where practical.
- No application runtime behavior, provider integration, database schema, or
  deployment architecture may change as part of this compiler migration.
- Unrelated dirty-worktree changes must not be staged or committed.

## Acceptance Criteria

1. TypeScript 7.0.2 is the compiler used by required monorepo `check-types` gates.
2. TypeScript 6.0.2 remains available only as a documented compatibility API and
   fallback for tools that cannot consume TypeScript 7.
3. All 24 TypeScript configurations parse and execute under TypeScript 7.
4. Every project has explicit, minimal global type configuration where required.
5. Marketing no longer uses `baseUrl`, and its alias imports still resolve.
6. TypeScript 6 and 7 diagnostics match, with every intentional exception recorded
   and reviewed.
7. `typescript-eslint`, ESLint, ts-node, tsx, tsup, Next.js, Vinext/Vite, Vitest,
   Jest, Drizzle tooling, and commitlint execute without compiler-API regressions.
8. Direct TypeScript package builds emit usable JavaScript and declarations under the
   selected compiler path.
9. Frozen install and peer-dependency checks pass.
10. Aggregate lint, test, check-types, and build gates have no migration-caused
    regressions.
11. Controlled benchmarks demonstrate the defined speedup threshold or document why
    end-to-end orchestration limits the gain despite faster compiler phases.
12. Three representative CI runs complete without new nondeterminism, memory
    exhaustion, or cache corruption.
13. Tech-stack and operator documentation describe compiler ownership, editor setup,
    concurrency, fallback, and rollback.
14. A TypeScript 7.1+ compatibility-package removal follow-up is recorded.

## Out of Scope

- Implementing or depending on the future TypeScript 7.1 programmatic API.
- Removing TypeScript 6 before all compiler-API consumers support TypeScript 7.
- Introducing project references solely to amplify benchmark results.
- Refactoring application types or public contracts unless TypeScript 7 exposes a
  genuine migration incompatibility.
- Upgrading unrelated frameworks, test runners, linters, or build tools beyond the
  minimum version required for TypeScript 7 compatibility.
- Adding `ignoreBuildErrors`, broad suppression comments, or weaker strictness.
- Claiming official 8-12x benchmark results as local results without controlled local
  evidence.

## Constraints and Risks

- TypeScript 7.0 has no stable programmatic API; a direct replacement of the
  `typescript` package would break or strand compiler-embedding tools.
- `types: []` is a new default and can expose missing ambient-type declarations across
  tests and Node utilities.
- TypeScript 7 parallelism can oversubscribe CI when nested under Turbo parallelism.
- The repository has known pre-existing type/build debt and a heavily active worktree;
  attribution must use recorded baselines and explicit staging.
- Next.js and Vinext may invoke TypeScript internally rather than through workspace
  scripts; their compiler selection must be proven rather than assumed.
- Declaration output and diagnostic ordering may differ even when runtime semantics do
  not; comparisons must distinguish meaningful changes from formatting noise.

## References

- TypeScript 7.0 release announcement and 6/7 side-by-side guidance
- `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`
- `packages/config/tsconfig/base.json`
- All `apps/**/tsconfig*.json` and `packages/**/tsconfig*.json`
- `turbo.json` and CI workflow definitions
- `measure/tracks/typescript6_major_migration/`
- `measure/archive/dependency_upgrade_hardening_20260607/`
